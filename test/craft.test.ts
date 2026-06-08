import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'

const CLI = new URL('../dist/cli.js', import.meta.url)
const PACKAGE_JSON = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  version?: string
}

type CreateRepositoryOptions = {
  version?: string
  skill?: string
}

type SkillMetadata = {
  package?: string
  version?: string
  source?: string
}

type CraftCommandError = Error & {
  status?: number | null
  stderr?: Buffer | string
}

function createRepository({ version = '1.4.0', skill = '# ts-match skill\n' }: CreateRepositoryOptions = {}): string {
  const directory = mkdtempSync(join(tmpdir(), 'craft-test-'))
  const packageRoot = join(directory, 'node_modules', '@diegogbrisa', 'ts-match')

  mkdirSync(packageRoot, { recursive: true })
  writeFileSync(join(directory, 'package.json'), JSON.stringify({ type: 'module' }, null, 2))
  writeFileSync(
    join(packageRoot, 'package.json'),
    JSON.stringify({ name: '@diegogbrisa/ts-match', version, type: 'module' }, null, 2),
  )
  writeFileSync(join(packageRoot, 'SKILL.md'), skill)

  return directory
}

function runCraft(args: string[], cwd: string): string {
  return execFileSync(process.execPath, [CLI.pathname, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function runCraftError(args: string[], cwd: string): CraftCommandError {
  try {
    runCraft(args, cwd)
  } catch (error) {
    if (error instanceof Error) {
      return error as CraftCommandError
    }

    throw error
  }

  throw new Error('Expected craft command to fail')
}

test('installs the ts-match skill from the installed package version', () => {
  const directory = createRepository({
    version: '1.5.0',
    skill: '# versioned skill\n',
  })

  const output = runCraft(['ts-match', 'skill', 'install'], directory)
  const skill = readFileSync(join(directory, '.agents', 'skills', 'ts-match', 'SKILL.md'), 'utf8')
  const metadata = JSON.parse(
    readFileSync(join(directory, '.agents', 'skills', 'ts-match', 'metadata.json'), 'utf8'),
  ) as SkillMetadata

  expect(output).toMatch(/Installed ts-match skill/)
  expect(skill).toBe('# versioned skill\n')
  expect(metadata.package).toBe('@diegogbrisa/ts-match')
  expect(metadata.version).toBe('1.5.0')
  expect(metadata.source).toBe('installed-package')
})

test('refuses to overwrite a locally edited skill without --force', () => {
  const directory = createRepository()

  runCraft(['ts-match', 'skill', 'install'], directory)
  writeFileSync(join(directory, '.agents', 'skills', 'ts-match', 'SKILL.md'), '# local edit\n')

  const error = runCraftError(['ts-match', 'skill', 'install'], directory)

  expect(error.status).toBe(1)
  expect(String(error.stderr)).toMatch(/local changes/)
})

test('repairs metadata when an identical skill file already exists', () => {
  const directory = createRepository({
    version: '1.5.0',
    skill: '# versioned skill\n',
  })
  const skillDirectory = join(directory, '.agents', 'skills', 'ts-match')

  mkdirSync(skillDirectory, { recursive: true })
  writeFileSync(join(skillDirectory, 'SKILL.md'), '# versioned skill\n')

  runCraft(['ts-match', 'skill', 'install'], directory)

  const metadata = JSON.parse(readFileSync(join(skillDirectory, 'metadata.json'), 'utf8')) as SkillMetadata

  expect(metadata.package).toBe('@diegogbrisa/ts-match')
  expect(metadata.version).toBe('1.5.0')
})

test('overwrites a locally edited skill with --force', () => {
  const directory = createRepository({
    skill: '# package skill\n',
  })

  runCraft(['ts-match', 'skill', 'install'], directory)
  writeFileSync(join(directory, '.agents', 'skills', 'ts-match', 'SKILL.md'), '# local edit\n')
  runCraft(['ts-match', 'skill', 'install', '--force'], directory)

  const skill = readFileSync(join(directory, '.agents', 'skills', 'ts-match', 'SKILL.md'), 'utf8')

  expect(skill).toBe('# package skill\n')
})

test('fails clearly when ts-match is not installed', () => {
  const directory = mkdtempSync(join(tmpdir(), 'craft-test-'))
  writeFileSync(join(directory, 'package.json'), JSON.stringify({ type: 'module' }, null, 2))

  const error = runCraftError(['ts-match', 'skill', 'install'], directory)

  expect(error.status).toBe(1)
  expect(String(error.stderr)).toMatch(/@diegogbrisa\/ts-match is not installed/)
})

test('rejects unsupported flags', () => {
  const directory = createRepository()

  const error = runCraftError(['ts-match', 'skill', 'install', '--unknown'], directory)

  expect(error.status).toBe(1)
  expect(String(error.stderr)).toMatch(/Unknown option: --unknown/)
})

test('shows the installed craft version with --version', () => {
  const directory = createRepository()

  const output = runCraft(['--version'], directory)

  expect(output.trim()).toBe(PACKAGE_JSON.version)
})

test('shows the installed craft version with -v', () => {
  const directory = createRepository()

  const output = runCraft(['-v'], directory)

  expect(output.trim()).toBe(PACKAGE_JSON.version)
})

test('shows the self-upgrade command without running it', () => {
  const directory = createRepository()

  const output = runCraft(['upgrade', '--dry-run'], directory)

  expect(output).toMatch(/Would run:/)
  expect(output).toMatch(/@diegogbrisa\/craft@latest/)
  expect(output).toMatch(/(?:pnpm add -g|npm install -g)/)
})

test('supports forcing pnpm for self-upgrade', () => {
  const directory = createRepository()

  const output = runCraft(['upgrade', '--dry-run', '--pnpm'], directory)

  expect(output).toContain('pnpm add -g @diegogbrisa/craft@latest')
})

test('supports forcing npm for self-upgrade', () => {
  const directory = createRepository()

  const output = runCraft(['upgrade', '--dry-run', '--npm'], directory)

  expect(output).toContain('npm install -g @diegogbrisa/craft@latest')
})

test('rejects conflicting self-upgrade package manager flags', () => {
  const directory = createRepository()

  const error = runCraftError(['upgrade', '--dry-run', '--npm', '--pnpm'], directory)

  expect(error.status).toBe(1)
  expect(String(error.stderr)).toMatch(/Use only one of --npm or --pnpm/)
})
