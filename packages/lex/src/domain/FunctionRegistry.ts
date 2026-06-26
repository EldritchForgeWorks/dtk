import type { Value } from './ASTNode.js';

export type FunctionImpl = (args: Value[]) => Value;

const BUILTINS: Record<string, FunctionImpl> = {
  floor: (args) => Math.floor(Number(args[0])),
  ceil:  (args) => Math.ceil(Number(args[0])),
  round: (args) => Math.round(Number(args[0])),
  max:   (args) => Math.max(Number(args[0]), Number(args[1])),
  min:   (args) => Math.min(Number(args[0]), Number(args[1])),
  clamp: (args) => Math.min(Math.max(Number(args[0]), Number(args[1])), Number(args[2])),
  abs:   (args) => Math.abs(Number(args[0])),
  if:    (args) => args[0] ? args[1] ?? null : args[2] ?? null,
};

export class FunctionRegistry {
  private readonly _fns = new Map<string, FunctionImpl>();

  constructor() {
    for (const [name, fn] of Object.entries(BUILTINS)) {
      this._fns.set(name, fn);
    }
  }

  register(name: string, fn: FunctionImpl): void {
    if (this._fns.has(name)) {
      console.warn(`FunctionRegistry: overriding existing function "${name}"`);
    }
    this._fns.set(name, fn);
  }

  call(name: string, args: Value[]): Value | null {
    const fn = this._fns.get(name);
    if (!fn) {
      console.warn(`FunctionRegistry: unknown function "${name}"`);
      return null;
    }
    return fn(args);
  }

  has(name: string): boolean {
    return this._fns.has(name);
  }
}
