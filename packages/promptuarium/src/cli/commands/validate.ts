import { CorpusValidator } from '../../domain/services/CorpusValidator.js';
import { YamlExemplarSource } from '../../adapters/node/YamlExemplarSource.js';
import { InMemoryExemplarSource } from '../../adapters/in-memory/InMemoryExemplarSource.js';
import type { PromptariumConfig } from '../config.js';

export async function runValidate(
  config: PromptariumConfig,
  opts: { json: boolean },
): Promise<void> {
  const rawList = await new YamlExemplarSource(config.exemplarsDir).list();
  const source = new InMemoryExemplarSource(rawList);
  const { result } = await new CorpusValidator().validate(source);

  if (opts.json) {
    process.stdout.write(
      JSON.stringify({ valid: result.valid, errors: result.errors }) + '\n',
    );
  } else if (result.valid) {
    process.stdout.write('All valid\n');
  } else {
    for (const err of result.errors) {
      process.stderr.write(
        `[${err.phase}] ${err.filePath}: ${err.exemplarId}.${err.field}: ${err.message}\n`,
      );
    }
  }

  if (!result.valid) process.exit(1);
}
