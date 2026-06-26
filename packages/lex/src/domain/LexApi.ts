import type { CodexEntry } from './CodexEntry.js';
import type { CodexRegistry } from './CodexRegistry.js';
import type { ExpressionEngine } from './ExpressionEngine.js';
import type { ConditionEvaluator } from './ConditionEvaluator.js';
import type { ExpressionContext } from './ExpressionContext.js';
import type { Value } from './ASTNode.js';
import type { FunctionImpl } from './FunctionRegistry.js';
import type { IEditorRenderer, EditorOptions } from '../ports/IEditorRenderer.js';

interface LexApiDeps {
  registry: CodexRegistry;
  engine: ExpressionEngine;
  evaluator: ConditionEvaluator;
  editor: IEditorRenderer;
}

export class LexApi {
  private _ready = false;
  private readonly registry: CodexRegistry;
  private readonly engine: ExpressionEngine;
  private readonly evaluator: ConditionEvaluator;
  private readonly editor: IEditorRenderer;

  constructor(deps: LexApiDeps) {
    this.registry = deps.registry;
    this.engine = deps.engine;
    this.evaluator = deps.evaluator;
    this.editor = deps.editor;
  }

  get isReady(): boolean { return this._ready; }

  markReady(): void { this._ready = true; }

  registerCodex(systemId: string, entries: CodexEntry[]): void {
    this.registry.register(systemId, entries);
  }

  exportCodexJson(systemId: string): Record<string, string> {
    return this.registry.exportJson(systemId);
  }

  evaluate(expr: string, context: ExpressionContext): Value | null {
    if (!this._ready) {
      console.warn('LexApi: evaluate() called before dtk-lex is ready');
      return null;
    }
    return this.engine.evaluate(expr, context);
  }

  registerFunction(name: string, fn: FunctionImpl): void {
    this.engine.registerFunction(name, fn);
  }

  resolveCondition(systemId: string, condId: string, ctx: ExpressionContext): boolean {
    return this.evaluator.evaluate(systemId, condId, ctx);
  }

  openEditor(options: EditorOptions): Promise<string | null> {
    return this.editor.open(options);
  }
}
