export interface ValidationError {
  readonly exemplarId: string;
  readonly filePath: string;
  readonly field: string;
  readonly message: string;
  readonly phase: 'schema' | 'cross-reference' | 'uniqueness';
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
}
