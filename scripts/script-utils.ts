import { readFileSync } from 'node:fs'

export function readPackageJson(): { readonly [key: string]: unknown } {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
  if (!isRecord(packageJson)) throw new Error('package.json must contain an object.')
  return packageJson
}

export function isRecord(value: unknown): value is { readonly [key: string]: unknown } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
