import { MechanicSequenceExemplarSchema } from '@eldritchforgeworks/dtk-types/sequence';
import { CorpusValidator } from '../../domain/services/CorpusValidator.js';
import { ExemplarCompiler } from '../../domain/services/ExemplarCompiler.js';
import { YamlExemplarSource } from '../../adapters/node/YamlExemplarSource.js';
import { InMemoryExemplarSource } from '../../adapters/in-memory/InMemoryExemplarSource.js';
import { LevelDBCompendiumTarget } from '../../adapters/node/LevelDBCompendiumTarget.js';
import { makeStableId, type CompiledEntry } from '../../domain/value-objects/CompiledEntry.js';
import type { OutputMapperConfig, PromptariumConfig, SequenceSourceConfig } from '../config.js';

function validateOutputMapper(mapper: unknown, index: number): string[] {
  if (typeof mapper !== 'object' || mapper === null) {
    return [`outputs[${index}] must be an object`];
  }
  const entry = mapper as Record<string, unknown>;
  const issues: string[] = [];
  if (typeof entry.packId !== 'string' || entry.packId.length === 0) {
    issues.push(`outputs[${index}].packId must be a non-empty string`);
  }
  if (typeof entry.documentType !== 'string' || entry.documentType.length === 0) {
    issues.push(`outputs[${index}].documentType must be a non-empty string`);
  }
  if (
    !Array.isArray(entry.kinds) ||
    entry.kinds.length === 0 ||
    !entry.kinds.every(k => typeof k === 'string')
  ) {
    issues.push(`outputs[${index}].kinds must be a non-empty array of strings`);
  }
  if (typeof entry.fieldMap !== 'object' || entry.fieldMap === null || Array.isArray(entry.fieldMap)) {
    issues.push(`outputs[${index}].fieldMap must be an object`);
  }
  return issues;
}

function validateSequenceSourceConfig(seq: unknown): string[] {
  if (typeof seq !== 'object' || seq === null) {
    return ['sequences must be an object'];
  }
  const entry = seq as Record<string, unknown>;
  const issues: string[] = [];
  if (typeof entry.dir !== 'string' || entry.dir.length === 0) {
    issues.push('sequences.dir must be a non-empty string');
  }
  if (typeof entry.packId !== 'string' || entry.packId.length === 0) {
    issues.push('sequences.packId must be a non-empty string');
  }
  return issues;
}

/** Reads and validates every `MechanicSequenceExemplar` YAML document under
 *  `seqConfig.dir`, returning either the compiled `dtk.sequence` entries or
 *  the validation issues — never both, so the caller can enforce
 *  all-or-nothing writes. Envelope matches `dtk-shadowrun`'s shipped
 *  `sr-sequences/01-RangedAttack.json` exactly: `system` is the bare
 *  document (schema-stripped of any extra `name` field, which is why `name`
 *  is read from the RAW source instead), `flags` empty. */
async function compileSequenceSource(
  seqConfig: SequenceSourceConfig,
): Promise<{ entries: CompiledEntry[]; issues: string[] }> {
  const source = new YamlExemplarSource(seqConfig.dir);
  const rawList = await source.list();
  const issues: string[] = [];
  const entries: CompiledEntry[] = [];

  for (const raw of rawList) {
    const parsed = MechanicSequenceExemplarSchema.safeParse(raw.data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        issues.push(`${raw.filePath}: ${issue.path.join('.') || '(root)'}: ${issue.message}`);
      }
      continue;
    }
    const rawName =
      raw.data && typeof raw.data === 'object' ? (raw.data as Record<string, unknown>).name : undefined;
    entries.push({
      _id: makeStableId(parsed.data.id),
      name: typeof rawName === 'string' ? rawName : parsed.data.id,
      type: 'dtk.sequence',
      system: parsed.data as unknown as Record<string, unknown>,
      flags: {},
    });
  }

  return { entries, issues };
}

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
    return;
  }

  const outputs: readonly OutputMapperConfig[] = config.outputs ?? [];
  const configIssues: string[] = [];
  outputs.forEach((mapper, i) => configIssues.push(...validateOutputMapper(mapper, i)));
  if (config.sequences !== undefined) {
    configIssues.push(...validateSequenceSourceConfig(config.sequences));
  }
  if (configIssues.length > 0) {
    for (const issue of configIssues) process.stderr.write(`[config] ${issue}\n`);
    process.exit(1);
    return;
  }

  if (outputs.length === 0 && config.sequences === undefined) {
    process.stderr.write(
      '[config] no pack outputs configured — add an "outputs" array and/or a "sequences" ' +
        'section to promptuarium.config.yaml; compile refuses to silently write zero packs\n',
    );
    process.exit(1);
    return;
  }

  // Resolve sequence entries BEFORE writing anything, so an invalid sequence
  // document blocks the whole compile (all-or-nothing, matching the
  // exemplar-corpus validation gate above) rather than leaving a partial set
  // of packs on disk.
  let sequenceEntries: CompiledEntry[] = [];
  if (config.sequences !== undefined) {
    const { entries, issues } = await compileSequenceSource(config.sequences);
    if (issues.length > 0) {
      for (const issue of issues) process.stderr.write(`[sequences] ${issue}\n`);
      process.exit(1);
      return;
    }
    sequenceEntries = entries;
  }

  const target = new LevelDBCompendiumTarget(config.outputDir);
  const compiler = new ExemplarCompiler(target);
  const compiledAt = new Date().toISOString();
  await compiler.compile(corpus, outputs, compiledAt);

  if (config.sequences !== undefined) {
    await target.write(config.sequences.packId, sequenceEntries, 'Item');
  }

  process.stdout.write('Compile complete.\n');
}
