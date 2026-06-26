import type { ExpressionContext } from './ExpressionContext.js';
import type { Value } from './ASTNode.js';
import type { FunctionImpl } from './FunctionRegistry.js';
import { Lexer } from './Lexer.js';
import { Parser } from './Parser.js';
import { Interpreter } from './Interpreter.js';
import { FunctionRegistry } from './FunctionRegistry.js';

export class ExpressionEngine {
  private readonly lexer = new Lexer();
  private readonly parser = new Parser();
  private readonly functions: FunctionRegistry;
  private readonly interpreter: Interpreter;

  constructor(functions?: FunctionRegistry) {
    this.functions = functions ?? new FunctionRegistry();
    this.interpreter = new Interpreter(this.functions);
  }

  evaluate(expr: string, context: ExpressionContext): Value {
    const tokens = this.lexer.tokenise(expr);
    const ast = this.parser.parse(tokens);
    return this.interpreter.evaluate(ast, context);
  }

  registerFunction(name: string, fn: FunctionImpl): void {
    this.functions.register(name, fn);
  }
}
