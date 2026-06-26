export interface LexContext {
  systemId: string
  actor?: Record<string, unknown>
  target?: Record<string, unknown>
  item?: Record<string, unknown>
  combat?: { round: number; turn: number; combatantId: string }
  steps?: Record<string, unknown>
}

export type LexValue = string | number | boolean | null

export interface ValidationError {
  path: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export interface LexEditorOptions {
  systemId: string
  initialValue?: string
  context?: LexContext
}

export interface LexApi {
  registerCodex(systemId: string, entries: unknown[]): void
  evaluate(expression: string, context: LexContext): LexValue
  registerFunction(name: string, fn: (...args: LexValue[]) => LexValue): void
  openEditor(options: LexEditorOptions): Promise<string | null>
  exportCodexJson(systemId: string): Record<string, string>
  readonly isReady: boolean
}
