import { YamlExemplarSource } from '../../src/adapters/node/YamlExemplarSource.js'
import { InMemoryCompendiumTarget } from '../../src/adapters/in-memory/InMemoryCompendiumTarget.js'
import { ExemplarCorpus } from '../../src/domain/entities/ExemplarCorpus.js'
import { CorpusValidator } from '../../src/domain/services/CorpusValidator.js'
import { ExemplarCompiler } from '../../src/domain/services/ExemplarCompiler.js'

export async function runCompile(args: string[]): Promise<void> {
  const sourceDir = args.find((a) => !a.startsWith('-')) ?? '.'
  const packArg = args.find((a) => a.startsWith('--pack='))
  const packName = packArg !== undefined ? packArg.slice('--pack='.length) : 'default'

  const source = new YamlExemplarSource(sourceDir)
  const exemplars = await source.load()

  const corpus = new ExemplarCorpus()
  for (const e of exemplars) corpus.add(e)

  // For CLI use, write to in-memory then print summary
  // Real use would swap in LevelDBCompendiumTarget
  const target = new InMemoryCompendiumTarget()
  const validator = new CorpusValidator()
  const compiler = new ExemplarCompiler(validator, target)

  const result = await compiler.compile(corpus, packName)

  if (!result.valid) {
    process.stderr.write(`Compilation failed with ${result.errors.length} error(s):\n`)
    for (const err of result.errors) {
      process.stderr.write(`  [${err.id}] ${err.path}: ${err.message}\n`)
    }
    process.exit(1)
  }

  const written = target.getWritten(packName)
  process.stdout.write(`Compiled ${written?.length ?? 0} entries to pack "${packName}"\n`)
  process.exit(0)
}
