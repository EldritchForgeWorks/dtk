export interface IHookEmitter {
  emit(hookName: string, payload: unknown): void;
}
