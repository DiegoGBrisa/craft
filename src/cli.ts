#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const TS_MATCH_PACKAGE = '@diegogbrisa/ts-match'
const TS_MATCH_SKILL_DIR = join('.agents', 'skills', 'ts-match')
const TS_MATCH_FILE = 'SKILL.md'
const TS_MATCH_METADATA_FILE = 'metadata.json'

type SkillCommand = 'install' | 'update'

type ParsedFlags = {
  flags: Set<string>
  positional: string[]
}

type PackageJson = {
  name?: string
  version?: string
}

type InstalledSkillMetadata = {
  package?: string
  version?: string
  skillHash?: string
  installedAt?: string
  source?: string
}

type TsMatchPackageInfo = {
  version: string
  skill: string
  skillHash: string
}

type SkillPaths = {
  skillDirectory: string
  skillPath: string
  metadataPath: string
}

type WriteSkillFilesInput = {
  repositoryRoot: string
  packageInfo: TsMatchPackageInfo
  force: boolean
  mode: SkillCommand
}

const [, , command, ...args] = process.argv

function printHelp(): void {
  console.log(`craft

Install version-matched agent skills from packages into repositories.

Usage:
  craft help
  craft ts-match skill install [--force]
  craft ts-match skill update [--force]
  craft ts-match skill status

Commands:
  help                      Show this help text.
  ts-match skill install    Install the ts-match agent skill for the installed package version.
  ts-match skill update     Update the ts-match agent skill for the installed package version.
  ts-match skill status     Show the installed ts-match skill version.
`)
}

function printError(message: string): void {
  console.error(`craft: ${message}`)
}

function parseFlags(values: string[]): ParsedFlags {
  const flags = new Set<string>()
  const positional: string[] = []

  for (const value of values) {
    if (value.startsWith('--')) {
      flags.add(value)
      continue
    }

    positional.push(value)
  }

  return { flags, positional }
}

function assertSupportedFlags(flags: Set<string>, supportedFlags: Set<string>): void {
  for (const flag of flags) {
    if (!supportedFlags.has(flag)) {
      throw new Error(`Unknown option: ${flag}`)
    }
  }
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function getRepositoryRoot(cwd: string): string {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return cwd
  }
}

function findPackageRoot(repositoryRoot: string): string | null {
  const repositoryPackageJsonPath = join(repositoryRoot, 'package.json')

  if (existsSync(repositoryPackageJsonPath)) {
    const repositoryPackageJson = readJson<PackageJson>(repositoryPackageJsonPath)

    if (repositoryPackageJson.name === TS_MATCH_PACKAGE && existsSync(join(repositoryRoot, TS_MATCH_FILE))) {
      return repositoryRoot
    }
  }

  const directRoot = join(repositoryRoot, 'node_modules', '@diegogbrisa', 'ts-match')

  if (existsSync(join(directRoot, 'package.json'))) {
    return realpathSync(directRoot)
  }

  const requireFromRepository = createRequire(join(repositoryRoot, 'package.json'))

  try {
    const entrypoint = requireFromRepository.resolve(TS_MATCH_PACKAGE)
    let current = dirname(entrypoint)

    while (current !== dirname(current)) {
      const packageJsonPath = join(current, 'package.json')

      if (existsSync(packageJsonPath)) {
        const packageJson = readJson<PackageJson>(packageJsonPath)

        if (packageJson.name === TS_MATCH_PACKAGE) {
          return current
        }
      }

      current = dirname(current)
    }
  } catch {
    return null
  }

  return null
}

function loadTsMatchPackage(repositoryRoot: string): TsMatchPackageInfo {
  const packageRoot = findPackageRoot(repositoryRoot)

  if (!packageRoot) {
    throw new Error(
      `${TS_MATCH_PACKAGE} is not installed in this repository. Install it first, then run craft ts-match skill install.`,
    )
  }

  const packageJsonPath = join(packageRoot, 'package.json')
  const skillPath = join(packageRoot, TS_MATCH_FILE)

  if (!existsSync(skillPath)) {
    throw new Error(`${TS_MATCH_PACKAGE} is installed, but ${TS_MATCH_FILE} was not found in the package.`)
  }

  const packageJson = readJson<PackageJson>(packageJsonPath)

  if (typeof packageJson.version !== 'string' || packageJson.version.length === 0) {
    throw new Error(`${TS_MATCH_PACKAGE} package.json does not include a valid version.`)
  }

  const skill = readFileSync(skillPath, 'utf8')

  return {
    version: packageJson.version,
    skill,
    skillHash: hash(skill),
  }
}

function getSkillPaths(repositoryRoot: string): SkillPaths {
  const skillDirectory = join(repositoryRoot, TS_MATCH_SKILL_DIR)

  return {
    skillDirectory,
    skillPath: join(skillDirectory, TS_MATCH_FILE),
    metadataPath: join(skillDirectory, TS_MATCH_METADATA_FILE),
  }
}

function readMetadata(metadataPath: string): InstalledSkillMetadata | null {
  if (!existsSync(metadataPath)) {
    return null
  }

  try {
    return readJson<InstalledSkillMetadata>(metadataPath)
  } catch {
    return null
  }
}

function writeSkillFiles({ repositoryRoot, packageInfo, force, mode }: WriteSkillFilesInput): void {
  const { skillDirectory, skillPath, metadataPath } = getSkillPaths(repositoryRoot)
  const existingSkill = existsSync(skillPath) ? readFileSync(skillPath, 'utf8') : null
  const existingMetadata = readMetadata(metadataPath)

  if (existingSkill !== null) {
    const existingHash = hash(existingSkill)

    if (
      existingHash === packageInfo.skillHash &&
      existingMetadata?.package === TS_MATCH_PACKAGE &&
      existingMetadata.version === packageInfo.version &&
      existingMetadata.skillHash === packageInfo.skillHash
    ) {
      console.log(`ts-match skill is already installed for ${TS_MATCH_PACKAGE}@${packageInfo.version}.`)
      return
    }

    const previousManagedHash = typeof existingMetadata?.skillHash === 'string' ? existingMetadata.skillHash : null

    if (!force && existingHash !== packageInfo.skillHash && previousManagedHash !== existingHash) {
      throw new Error(
        `${TS_MATCH_SKILL_DIR}/${TS_MATCH_FILE} has local changes or was not installed by craft. Re-run with --force to overwrite it.`,
      )
    }
  }

  mkdirSync(skillDirectory, { recursive: true })
  writeFileSync(skillPath, packageInfo.skill)
  writeFileSync(
    metadataPath,
    `${JSON.stringify(
      {
        package: TS_MATCH_PACKAGE,
        version: packageInfo.version,
        skillHash: packageInfo.skillHash,
        installedAt: new Date().toISOString(),
        source: 'installed-package',
      },
      null,
      2,
    )}\n`,
  )

  const action = mode === 'update' ? 'Updated' : 'Installed'
  console.log(`${action} ts-match skill for ${TS_MATCH_PACKAGE}@${packageInfo.version}.`)
  console.log(`Wrote ${TS_MATCH_SKILL_DIR}/${TS_MATCH_FILE}.`)
}

function installOrUpdateSkill(mode: SkillCommand, values: string[]): void {
  const { flags, positional } = parseFlags(values)

  assertSupportedFlags(flags, new Set(['--force']))

  if (positional.length > 0) {
    throw new Error(`Unexpected argument: ${positional[0]}`)
  }

  const repositoryRoot = getRepositoryRoot(process.cwd())
  const packageInfo = loadTsMatchPackage(repositoryRoot)

  writeSkillFiles({
    repositoryRoot,
    packageInfo,
    force: flags.has('--force'),
    mode,
  })
}

function showSkillStatus(values: string[]): void {
  const { flags, positional } = parseFlags(values)

  assertSupportedFlags(flags, new Set())

  if (positional.length > 0) {
    throw new Error(`Unexpected argument: ${positional[0]}`)
  }

  const repositoryRoot = getRepositoryRoot(process.cwd())
  const { skillPath, metadataPath } = getSkillPaths(repositoryRoot)
  const metadata = readMetadata(metadataPath)

  if (!existsSync(skillPath) || !metadata) {
    console.log('ts-match skill is not installed.')
    return
  }

  console.log(`ts-match skill installed for ${metadata.package}@${metadata.version}.`)
}

function main(): void {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp()
    return
  }

  if (command === 'ts-match' && args[0] === 'skill') {
    const action = args[1]
    const actionArgs = args.slice(2)

    if (action === 'install' || action === 'update') {
      installOrUpdateSkill(action, actionArgs)
      return
    }

    if (action === 'status') {
      showSkillStatus(actionArgs)
      return
    }
  }

  throw new Error(`Unknown command: ${[command, ...args].join(' ')}. Run craft help for usage.`)
}

try {
  main()
} catch (error: unknown) {
  printError(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
