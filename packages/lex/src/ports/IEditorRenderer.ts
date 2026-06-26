import type { ExpressionContext } from '../domain/ExpressionContext.js';

export interface EditorOptions {
  systemId: string;
  initialExpression?: string;
  context?: ExpressionContext;
  title?: string;
}

export interface IEditorRenderer {
  open(options: EditorOptions): Promise<string | null>;
}
