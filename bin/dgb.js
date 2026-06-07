#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'

const TS_MATCH_PACKAGE = '@diegogbrisa/ts-match'
const TS_MATCH_SKILL_DIR = join('.agents', 'skills', 'ts-match')
const TS_MATCH_SKILL_FILE = 'SKILL.md'
const TS_MATCH_METADATA_FILE = 'metadata.json'

const [, , command, ...args] = process.argv

function printHelp() {
  console.log(`dgb

CLI for Diego G Brisa packages.

Usage:
  dgb help
  dgb ts-match skill install [--force]
  dgb ts-match skill update [--force]
  dgb ts-match skill status

Commands:
  help                      Show this help text.
  ts-match skill install    Install the ts-match agent skill for the installed package version.
  ts-match skill update     Update the ts-match agent skill for the installed package version.
  ts-match skill status     Show the installed ts-match skill version.
`)
}

function printError(message) {
  console.error(`dgb: ${message}`)
}

function parseFlags(values) {
  const flags = new Set()
  const positional = []

  for (const value of values) {
    if (value.startsWith('--')) {
      flags.add(value)
      continue
    }

    positional.push(value)
  }

  return { flags, positional }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex')
}

function getRepositoryRoot(cwd) {
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

function findPackageRoot(repositoryRoot) {
  const repositoryPackageJsonPath = join(repositoryRoot, 'package.json')

  if (existsSync(repositoryPackageJsonPath)) {
    const repositoryPackageJson = readJson(repositoryPackageJsonPath)

    if (
      repositoryPackageJson.name === TS_MATCH_PACKAGE &&
      existsSync(join(repositoryRoot, TS_MATCH_SKILL_FILE))
    ) {
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
        const packageJson = readJson(packageJsonPath)

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

function loadTsMatchPackage(repositoryRoot) {
  const packageRoot = findPackageRoot(repositoryRoot)

  if (!packageRoot) {
    throw new Error(
      `${TS_MATCH_PACKAGE} is not installed in this repository. Install it first, then run dgb ts-match skill install.`,
    )
  }

  const packageJsonPath = join(packageRoot, 'package.json')
  const skillPath = join(packageRoot, TS_MATCH_SKILL_FILE)

  if (!existsSync(skillPath)) {
    throw new Error(`${TS_MATCH_PACKAGE} is installed, but ${TS_MATCH_SKILL_FILE} was not found in the package.`)
  }

  const packageJson = readJson(packageJsonPath)
  const skill = readFileSync(skillPath, 'utf8')

  return {
    packageRoot,
    version: packageJson.version,
    skill,
    skillHash: hash(skill),
  }
}

function getSkillPaths(repositoryRoot) {
  const skillDirectory = join(repositoryRoot, TS_MATCH_SKILL_DIR)

  return {
    skillDirectory,
    skillPath: join(skillDirectory, TS_MATCH_SKILL_FILE),
    metadataPath: join(skillDirectory, TS_MATCH_METADATA_FILE),
  }
}

function readMetadata(metadataPath) {
  if (!existsSync(metadataPath)) {
    return null
  }

  try {
    return readJson(metadataPath)
  } catch {
    return null
  }
}

function writeSkillFiles({ repositoryRoot, packageInfo, force, mode }) {
  const { skillDirectory, skillPath, metadataPath } = getSkillPaths(repositoryRoot)
  const existingSkill = existsSync(skillPath) ? readFileSync(skillPath, 'utf8') : null
  const existingMetadata = readMetadata(metadataPath)

  if (existingSkill !== null) {
    const existingHash = hash(existingSkill)

    if (
      existingHash === packageInfo.skillHash &&
      existingMetadata?.package === TS_MATCH_PACKAGE &&
      existingMetadata?.version === packageInfo.version &&
      existingMetadata?.skillHash === packageInfo.skillHash
    ) {
      console.log(`ts-match skill is already installed for ${TS_MATCH_PACKAGE}@${packageInfo.version}.`)
      return
    }

    const previousManagedHash = typeof existingMetadata?.skillHash === 'string' ? existingMetadata.skillHash : null

    if (!force && existingHash !== packageInfo.skillHash && previousManagedHash !== existingHash) {
      throw new Error(
        `${TS_MATCH_SKILL_DIR}/${TS_MATCH_SKILL_FILE} has local changes or was not installed by dgb. Re-run with --force to overwrite it.`,
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
  console.log(`Wrote ${TS_MATCH_SKILL_DIR}/${TS_MATCH_SKILL_FILE}.`)
}

function installOrUpdateSkill(mode, values) {
  const { flags, positional } = parseFlags(values)

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

function showSkillStatus() {
  const repositoryRoot = getRepositoryRoot(process.cwd())
  const { skillPath, metadataPath } = getSkillPaths(repositoryRoot)
  const metadata = readMetadata(metadataPath)

  if (!existsSync(skillPath) || !metadata) {
    console.log('ts-match skill is not installed.')
    return
  }

  console.log(`ts-match skill installed for ${metadata.package}@${metadata.version}.`)
}

function main() {
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
      showSkillStatus()
      return
    }
  }

  throw new Error(`Unknown command: ${[command, ...args].join(' ')}. Run dgb help for usage.`)
}

try {
  main()
} catch (error) {
  printError(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
