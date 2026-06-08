import { readPackageJson } from './script-utils.js'

function packageVersion(): string {
  const { version } = readPackageJson()
  if (typeof version !== 'string') throw new Error('package.json must contain a string version.')
  return version
}

const [tagArgument] = process.argv.slice(2).filter((argument) => argument !== '--')
const tagName = tagArgument ?? process.env.GITHUB_REF_NAME ?? process.env.GITHUB_EVENT_RELEASE_TAG_NAME
if (tagName === undefined || tagName.length === 0) {
  throw new Error('Release tag is required. Pass it as an argument or set GITHUB_REF_NAME.')
}

const expectedTag = `v${packageVersion()}`
if (tagName !== expectedTag) {
  throw new Error(`Release tag/version mismatch: expected ${expectedTag} from package.json, received ${tagName}.`)
}

console.log(`release tag matches package version (${tagName})`)
