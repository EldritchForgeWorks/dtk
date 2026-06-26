export type ContextValue = number | boolean | string | null | ExpressionContext;

export interface ExpressionContext {
  readonly [key: string]: ContextValue;
}

export function resolvePath(context: ExpressionContext, path: string): ContextValue {
  const segments = path.split('.');
  let current: ContextValue = context;
  for (const seg of segments) {
    if (current === null || typeof current !== 'object') return null;
    current = (current as ExpressionContext)[seg] ?? null;
  }
  return current;
}
