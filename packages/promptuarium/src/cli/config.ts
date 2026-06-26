import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';

export interface LLMConfig {
  readonly provider: string;
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl?: string;
}

export interface PromptariumConfig {
  readonly exemplarsDir: string;
  readonly codexFile?: string;
  readonly outputDir: string;
  readonly modus?: string;
  readonly llm?: LLMConfig;
}

const DEFAULTS: PromptariumConfig = {
  exemplarsDir: './exemplars',
  outputDir: './packs',
};

export async function loadConfig(configPath?: string): Promise<PromptariumConfig> {
  const filePath = configPath ?? 'promptuarium.config.yaml';
  try {
    const content = await readFile(filePath, 'utf-8');
    const raw = yaml.load(content) as Partial<PromptariumConfig>;
    return { ...DEFAULTS, ...raw };
  } catch {
    return { ...DEFAULTS };
  }
}
