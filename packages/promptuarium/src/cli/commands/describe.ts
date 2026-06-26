import { writeFile } from 'node:fs/promises';
import yaml from 'js-yaml';
import { CorpusValidator } from '../../domain/services/CorpusValidator.js';
import { NLGenerator } from '../../domain/services/NLGenerator.js';
import { YamlExemplarSource } from '../../adapters/node/YamlExemplarSource.js';
import { InMemoryExemplarSource } from '../../adapters/in-memory/InMemoryExemplarSource.js';
import { JsonCodexProvider } from '../../adapters/node/JsonCodexProvider.js';
import { OpenAILLMClient } from '../../adapters/node/OpenAILLMClient.js';
import { StubCodexProvider } from '../../adapters/in-memory/StubCodexProvider.js';
import { StubLLMClient } from '../../adapters/in-memory/StubLLMClient.js';
import type { ICodexProvider } from '../../ports/ICodexProvider.js';
import type { ILLMClient } from '../../ports/ILLMClient.js';
import type { PromptariumConfig } from '../config.js';

export async function runDescribe(
  config: PromptariumConfig,
  opts: { force: boolean; llm: boolean },
): Promise<void> {
  const rawList = await new YamlExemplarSource(config.exemplarsDir).list();
  const source = new InMemoryExemplarSource(rawList);
  const { corpus, result } = await new CorpusValidator().validate(source);

  if (!result.valid) {
    process.stderr.write('Validation errors found; run validate first.\n');
    process.exit(1);
  }

  let codex: ICodexProvider;
  if (config.codexFile) {
    const jcp = new JsonCodexProvider(config.codexFile);
    await jcp.load();
    codex = jcp;
  } else {
    codex = new StubCodexProvider();
  }

  let llmClient: ILLMClient;
  if (opts.llm && config.llm) {
    llmClient = new OpenAILLMClient({
      apiKey: config.llm.apiKey,
      model: config.llm.model,
      baseUrl: config.llm.baseUrl,
    });
  } else {
    llmClient = new StubLLMClient();
  }

  const generator = new NLGenerator(codex, llmClient);
  const descriptions = await generator.generateAll(corpus, {
    useLlm: opts.llm,
    force: opts.force,
  });

  const rawById = new Map(
    rawList
      .filter(r => typeof r.data === 'object' && r.data !== null)
      .map(r => [(r.data as Record<string, unknown>)['id'] as string, r]),
  );

  for (const desc of descriptions) {
    const raw = rawById.get(desc.exemplarId);
    if (!raw) continue;
    const updated = { ...(raw.data as Record<string, unknown>), description: desc.text };
    await writeFile(raw.filePath, yaml.dump(updated), 'utf-8');
  }

  process.stdout.write(`Generated ${descriptions.length} description(s)\n`);
}
