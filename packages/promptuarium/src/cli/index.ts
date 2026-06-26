import { Command } from 'commander';
import { loadConfig } from './config.js';
import { runCompile } from './commands/compile.js';
import { runValidate } from './commands/validate.js';
import { runDescribe } from './commands/describe.js';

const program = new Command();

program
  .name('promptuarium')
  .description('Compile, validate, and describe exemplars')
  .version('0.1.0');

program
  .command('compile')
  .description('Compile exemplars to LevelDB packs')
  .option('--config <path>', 'Path to config file')
  .action(async (opts: { config?: string }) => {
    const config = await loadConfig(opts.config);
    await runCompile(config);
  });

program
  .command('validate')
  .description('Validate exemplar corpus')
  .option('--config <path>', 'Path to config file')
  .option('--json', 'Output machine-readable JSON')
  .action(async (opts: { config?: string; json?: boolean }) => {
    const config = await loadConfig(opts.config);
    await runValidate(config, { json: opts.json ?? false });
  });

program
  .command('describe')
  .description('Generate NL descriptions for exemplars')
  .option('--config <path>', 'Path to config file')
  .option('--force', 'Overwrite existing descriptions')
  .option('--llm', 'Use LLM provider for polishing')
  .action(async (opts: { config?: string; force?: boolean; llm?: boolean }) => {
    const config = await loadConfig(opts.config);
    await runDescribe(config, { force: opts.force ?? false, llm: opts.llm ?? false });
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
