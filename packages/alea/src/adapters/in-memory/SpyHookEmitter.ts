import type { IHookEmitter } from '../../ports/IHookEmitter.js';

export interface HookCall {
  name: string;
  payload: unknown;
}

export class SpyHookEmitter implements IHookEmitter {
  readonly calls: HookCall[] = [];

  emit(hookName: string, payload: unknown): void {
    this.calls.push({ name: hookName, payload });
  }

  callsFor(hookName: string): HookCall[] {
    return this.calls.filter((c) => c.name === hookName);
  }

  payloadsFor(hookName: string): unknown[] {
    return this.callsFor(hookName).map((c) => c.payload);
  }

  lastPayloadFor(hookName: string): unknown | undefined {
    const matching = this.callsFor(hookName);
    return matching.length > 0 ? matching[matching.length - 1].payload : undefined;
  }

  clear(): void {
    this.calls.length = 0;
  }
}
