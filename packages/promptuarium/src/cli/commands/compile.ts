import { CorpusValidator } from '../../domain/services/CorpusValidator.js';
import { ExemplarCompiler } from '../../domain/services/ExemplarCompiler.js';
import { YamlExemplarSource } from '../../adapters/node/YamlExemplarSource.js';
import { InMemoryExemplarSource } from '../../adapters/in-memory/InMemoryExemplarSource.js';
import { LevelDBCompendiumTarget } from '../../adapters/node/LevelDBCompendiumTarget.js';
import type { PromptariumConfig } from '../config.js';

export async function runCompile(config: PromptariumConfig): Promise<void> {
  const yamlSource = new YamlExemplarSource(config.exemplarsDir);
  const rawList = await yamlSource.list();
  const source = new InMemoryExemplarSource(rawList);
  const validator = new CorpusValidator();
  const { corpus, result } = await validator.validate(source);

  if (!result.valid) {
    for (const err of result.errors) {
      process.stderr.write(
        `[${err.phase}] ${err.filePath}: ${err.exemplarId}.${err.field}: ${err.message}\n`,
      );
    }
    process.exit(1);
  }

  const target = new LevelDBCompendiumTarget(config.outputDir);
  const compiler = new ExemplarCompiler(target);
  await compiler.compile(corpus, [], new Date().toISOString());
  process.stdout.write('Compile complete.\n');
}
