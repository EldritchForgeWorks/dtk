import { YamlExemplarSource } from '../../src/adapters/node/YamlExemplarSource.js'
import { ExemplarCorpus } from '../../src/domain/entities/ExemplarCorpus.js'
import { CorpusValidator } from '../../src/domain/services/CorpusValidator.js'

export async function runValidate(args: string[]): Promise<void> {
  const jsonFlag = args.includes('--json')
  const sourceDir = args.find((a) => !a.startsWith('-')) ?? '.'

  const source = new YamlExemplarSource(sourceDir)
  const exemplars = await source.load()

  const corpus = new ExemplarCorpus()
  for (const e of exemplars) corpus.add(e)

  const validator = new CorpusValidator()
  const result = validator.validate(corpus)

  if (jsonFlag) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
  } else {
    if (result.valid) {
      process.stdout.write(`OK — ${corpus.size()} exemplars validated\n`)
    } else {
      process.stderr.write(`Validation failed with ${result.errors.length} error(s):\n`)
      for (const err of result.errors) {
        process.stderr.write(`  [${err.id}] ${err.path}: ${err.message}\n`)
      }
    }
  }

  process.exit(result.valid ? 0 : 1)
}
