#!/usr/bin/env node

import { runValidate } from './commands/validate.js'
import { runCompile } from './commands/compile.js'
import { runDescribe } from './commands/describe.js'

const [, , command, ...rest] = process.argv

async function main(): Promise<void> {
  switch (command) {
    case 'validate':
      await runValidate(rest)
      break
    case 'compile':
      await runCompile(rest)
      break
    case 'describe':
      await runDescribe(rest)
      break
    default:
      process.stderr.write(
        'promptuarium — DTK compendium compiler\n\nUsage:\n' +
          '  promptuarium validate [dir] [--json]\n' +
          '  promptuarium compile  [dir] [--pack=<name>]\n' +
          '  promptuarium describe [dir] [--force] [--llm]\n',
      )
      process.exit(1)
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
