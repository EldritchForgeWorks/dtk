import type { ValidationError } from './lex-api.js'

export interface CompileOptions {
  exemplarsDir: string
  outputDir: string
  codexFile?: string
  llm?: boolean
  force?: boolean
}

export interface PromptariumValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export interface PromptariumApi {
  validate(exemplar: unknown): PromptariumValidationResult
  query(kind: string, systemId?: string): Promise<unknown[]>
  readonly isReady: boolean
}
