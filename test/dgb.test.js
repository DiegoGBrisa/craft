import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

const CLI = new URL('../dist/cli.js', import.meta.url)

function createRepository({ version = '1.4.0', skill = '# ts-match skill\n' } = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'dgb-test-'))
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

function runDgb(args, cwd) {
  return execFileSync(process.execPath, [CLI.pathname, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function runDgbError(args, cwd) {
  try {
    runDgb(args, cwd)
  } catch (error) {
    return error
  }

  throw new Error('Expected dgb command to fail')
}

test('installs the ts-match skill from the installed package version', () => {
  const directory = createRepository({
    version: '1.5.0',
    skill: '# versioned skill\n',
  })

  const output = runDgb(['ts-match', 'skill', 'install'], directory)
  const skill = readFileSync(join(directory, '.agents', 'skills', 'ts-match', 'SKILL.md'), 'utf8')
  const metadata = JSON.parse(
    readFileSync(join(directory, '.agents', 'skills', 'ts-match', 'metadata.json'), 'utf8'),
  )

  assert.match(output, /Installed ts-match skill/)
  assert.equal(skill, '# versioned skill\n')
  assert.equal(metadata.package, '@diegogbrisa/ts-match')
  assert.equal(metadata.version, '1.5.0')
  assert.equal(metadata.source, 'installed-package')
})

test('refuses to overwrite a locally edited skill without --force', () => {
  const directory = createRepository()

  runDgb(['ts-match', 'skill', 'install'], directory)
  writeFileSync(join(directory, '.agents', 'skills', 'ts-match', 'SKILL.md'), '# local edit\n')

  const error = runDgbError(['ts-match', 'skill', 'install'], directory)

  assert.equal(error.status, 1)
  assert.match(error.stderr.toString(), /local changes/)
})

test('repairs metadata when an identical skill file already exists', () => {
  const directory = createRepository({
    version: '1.5.0',
    skill: '# versioned skill\n',
  })
  const skillDirectory = join(directory, '.agents', 'skills', 'ts-match')

  mkdirSync(skillDirectory, { recursive: true })
  writeFileSync(join(skillDirectory, 'SKILL.md'), '# versioned skill\n')

  runDgb(['ts-match', 'skill', 'install'], directory)

  const metadata = JSON.parse(readFileSync(join(skillDirectory, 'metadata.json'), 'utf8'))

  assert.equal(metadata.package, '@diegogbrisa/ts-match')
  assert.equal(metadata.version, '1.5.0')
})

test('overwrites a locally edited skill with --force', () => {
  const directory = createRepository({
    skill: '# package skill\n',
  })

  runDgb(['ts-match', 'skill', 'install'], directory)
  writeFileSync(join(directory, '.agents', 'skills', 'ts-match', 'SKILL.md'), '# local edit\n')
  runDgb(['ts-match', 'skill', 'install', '--force'], directory)

  const skill = readFileSync(join(directory, '.agents', 'skills', 'ts-match', 'SKILL.md'), 'utf8')

  assert.equal(skill, '# package skill\n')
})

test('fails clearly when ts-match is not installed', () => {
  const directory = mkdtempSync(join(tmpdir(), 'dgb-test-'))
  writeFileSync(join(directory, 'package.json'), JSON.stringify({ type: 'module' }, null, 2))

  const error = runDgbError(['ts-match', 'skill', 'install'], directory)

  assert.equal(error.status, 1)
  assert.match(error.stderr.toString(), /@diegogbrisa\/ts-match is not installed/)
})

test('rejects unsupported flags', () => {
  const directory = createRepository()

  const error = runDgbError(['ts-match', 'skill', 'install', '--unknown'], directory)

  assert.equal(error.status, 1)
  assert.match(error.stderr.toString(), /Unknown option: --unknown/)
})
