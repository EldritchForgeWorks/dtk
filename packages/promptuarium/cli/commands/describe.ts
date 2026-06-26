import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { YamlExemplarSource } from '../../src/adapters/node/YamlExemplarSource.js'
import { ExemplarCorpus } from '../../src/domain/entities/ExemplarCorpus.js'
import { StubCodexProvider } from '../../src/adapters/in-memory/StubCodexProvider.js'
import { NLGenerator } from '../../src/domain/services/NLGenerator.js'
import { OpenAILLMClient } from '../../src/adapters/node/OpenAILLMClient.js'
import yaml from 'js-yaml'

export async function runDescribe(args: string[]): Promise<void> {
  const force = args.includes('--force')
  const writeback = args.includes('--write')
  const useLLM = args.includes('--llm')
  const sourceDir = args.find((a) => !a.startsWith('-')) ?? '.'

  const source = new YamlExemplarSource(sourceDir)
  const exemplars = await source.load()

  const corpus = new ExemplarCorpus()
  for (const e of exemplars) corpus.add(e)

  const codex = new StubCodexProvider()
  const llmClient = useLLM
    ? new OpenAILLMClient(process.env['OPENAI_API_KEY'] ?? '')
    : undefined
  const generator = new NLGenerator(codex, llmClient)

  let generated = 0
  let skipped = 0

  for (const exemplar of corpus.getEntries()) {
    if (exemplar.description !== undefined && !force) {
      skipped++
      continue
    }
    const description = await generator.generate(exemplar, force)
    process.stdout.write(`[${exemplar.id}] ${description}\n`)
    generated++

    if (writeback) {
      const filePath = join(sourceDir, `${exemplar.id}.yaml`)
      try {
        const raw = readFileSync(filePath, 'utf8')
        const doc = yaml.load(raw) as Record<string, unknown>
        doc['description'] = description
        writeFileSync(filePath, yaml.dump(doc, { lineWidth: -1 }), 'utf8')
      } catch {
        process.stderr.write(`[warn] Could not write back to ${exemplar.id}.yaml\n`)
      }
    }
  }

  process.stdout.write(`Generated: ${generated}, Skipped: ${skipped}\n`)
}
