import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';

export interface LLMConfig {
  readonly provider: string;
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl?: string;
}

/** One compendium pack's output mapping: which exemplar `kinds` land in
 *  `packId`, compiled as Foundry documents of `documentType`, with
 *  `fieldMap` remapping exemplar fields into `system.*`. `documentClass`
 *  picks the Foundry collection the pack is written under (`items` vs
 *  `actors`) — defaults to `'Item'`, the only class any DTK content
 *  compiles to today. */
export interface OutputMapperConfig {
  readonly packId: string;
  readonly documentType: string;
  readonly kinds: readonly string[];
  readonly fieldMap: Readonly<Record<string, string>>;
  readonly documentClass?: 'Item' | 'Actor';
}

/** A directory of `MechanicSequenceExemplar` YAML documents, compiled into
 *  `packId` using the fixed `dtk.sequence` envelope (see `compile.ts`). */
export interface SequenceSourceConfig {
  readonly dir: string;
  readonly packId: string;
}

export interface PromptariumConfig {
  readonly exemplarsDir: string;
  readonly codexFile?: string;
  readonly outputDir: string;
  readonly modus?: string;
  readonly llm?: LLMConfig;
  readonly outputs?: readonly OutputMapperConfig[];
  readonly sequences?: SequenceSourceConfig;
}

const DEFAULTS: PromptariumConfig = {
  exemplarsDir: './exemplars',
  outputDir: './packs',
};

/** Thrown when `promptuarium.config.yaml` exists but cannot be read or
 *  parsed — distinct from the file simply not existing (a project with no
 *  config file yet gets `DEFAULTS`, silently; a project with a BROKEN
 *  config file must not get the same silent fallback). */
export class ConfigParseError extends Error {}

export async function loadConfig(configPath?: string): Promise<PromptariumConfig> {
  const filePath = configPath ?? 'promptuarium.config.yaml';

  let content: string;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { ...DEFAULTS };
    }
    throw new ConfigParseError(`Failed to read ${filePath}: ${(err as Error).message}`);
  }

  let raw: Partial<PromptariumConfig>;
  try {
    raw = (yaml.load(content) ?? {}) as Partial<PromptariumConfig>;
  } catch (err) {
    throw new ConfigParseError(`Failed to parse ${filePath} as YAML: ${(err as Error).message}`);
  }

  return { ...DEFAULTS, ...raw };
}
