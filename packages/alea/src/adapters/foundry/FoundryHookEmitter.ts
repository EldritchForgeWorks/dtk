// Foundry adapter — requires live Foundry VTT environment; excluded from unit tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Hooks: any;

import type { IHookEmitter } from '../../ports/IHookEmitter.js';

export class FoundryHookEmitter implements IHookEmitter {
  emit(hookName: string, payload: unknown): void {
    Hooks.callAll(hookName, payload);
  }
}
