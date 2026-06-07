#!/usr/bin/env node

const [, , command, ...args] = process.argv

function printHelp() {
  console.log(`dgb

CLI for Diego G Brisa packages.

Usage:
  dgb help
  dgb ts-match skill install
  dgb ts-match skill update

Commands:
  help                      Show this help text.
  ts-match skill install    Install the ts-match agent skill. Coming soon.
  ts-match skill update     Update the ts-match agent skill. Coming soon.
`)
}

if (!command || command === 'help' || command === '--help' || command === '-h') {
  printHelp()
  process.exit(0)
}

if (command === 'ts-match' && args[0] === 'skill' && ['install', 'update'].includes(args[1])) {
  console.error(`dgb ${command} ${args.join(' ')} is not implemented yet.`)
  process.exit(1)
}

console.error(`Unknown command: ${[command, ...args].join(' ')}`)
console.error('Run dgb help for usage.')
process.exit(1)
