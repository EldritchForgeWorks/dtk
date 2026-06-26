/**
 * dtk-promptuarium Foundry module entry point.
 * No Node.js-only imports — runs in browser context.
 */

// Foundry VTT globals
declare const game: {
  dtk?: {
    register(opts: { id: string; version: string; api: unknown }): void;
  };
};
declare const Hooks: {
  on(event: string, fn: () => void): void;
  callAll(event: string): void;
};

import { ExemplarSchema } from '../../src/types/exemplar.js';
import type { ValidationResult } from '../../src/domain/value-objects/ValidationError.js';

export interface PromptariumApi {
  readonly isReady: boolean;
  validate(value: unknown): ValidationResult;
}

function makeApi(): PromptariumApi {
  return {
    isReady: true,
    validate(value: unknown): ValidationResult {
      const result = ExemplarSchema.safeParse(value);
      if (result.success) {
        return { valid: true, errors: [] };
      }
      return {
        valid: false,
        errors: result.error.issues.map(issue => ({
          exemplarId: '(unknown)',
          filePath: '',
          field: issue.path.join('.') || '(root)',
          message: issue.message,
          phase: 'schema' as const,
        })),
      };
    },
  };
}

Hooks.on('init', () => {
  const api = makeApi();
  game.dtk?.register({ id: 'dtk-promptuarium', version: '0.1.0', api });
  Hooks.callAll('dtk-promptuarium.ready');
});
