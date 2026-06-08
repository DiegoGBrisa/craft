import { spawnSync } from 'node:child_process'
import { readPackageJson } from './script-utils.js'

function packageNameAndVersion(): readonly [string, string] {
  const { name, version } = readPackageJson()
  if (typeof name !== 'string' || typeof version !== 'string') {
    throw new Error('package.json must contain string name and version fields.')
  }
  return [name, version]
}

function npmViewFailureMeansUnpublished(output: string): boolean {
  return output.includes('E404') || output.includes('404 Not Found') || output.includes('is not in this registry')
}

const [packageName, version] = packageNameAndVersion()
const npmSpecifier = `${packageName}@${version}`
const result = spawnSync('npm', ['view', npmSpecifier, 'version'], { encoding: 'utf8' })
const output = `${result.stdout}\n${result.stderr}`

if (result.error !== undefined) throw result.error
if (result.status === 0) throw new Error(`${npmSpecifier} already exists on npm. Refusing to publish an existing version.`)
if (!npmViewFailureMeansUnpublished(output)) {
  throw new Error(`npm view failed unexpectedly for ${npmSpecifier}.\n${output}`)
}

console.log(`npm version is unpublished (${npmSpecifier})`)
