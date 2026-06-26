import type { ASTNode, Value } from './ASTNode.js';
import type { ExpressionContext } from './ExpressionContext.js';
import { resolvePath } from './ExpressionContext.js';
import type { FunctionRegistry } from './FunctionRegistry.js';

export class Interpreter {
  constructor(private readonly functions: FunctionRegistry) {}

  evaluate(ast: ASTNode, context: ExpressionContext): Value {
    switch (ast.kind) {
      case 'number':
        return ast.value;

      case 'bool':
        return ast.value;

      case 'string':
        return ast.value;

      case 'at_ref': {
        const resolved = resolvePath(context, ast.path);
        if (typeof resolved === 'object' && resolved !== null) return null;
        return resolved;
      }

      case 'parse_error':
        console.warn(`Interpreter: parse error — ${ast.message}`);
        return null;

      case 'unary': {
        const val = this.evaluate(ast.operand, context);
        if (ast.op === '!') return !val;
        if (ast.op === '-') return -Number(val);
        return null;
      }

      case 'binary': {
        const { op } = ast;

        // short-circuit logical
        if (op === '&&') {
          const l = this.evaluate(ast.left, context);
          if (!l) return l;
          return this.evaluate(ast.right, context);
        }
        if (op === '||') {
          const l = this.evaluate(ast.left, context);
          if (l) return l;
          return this.evaluate(ast.right, context);
        }

        const left = this.evaluate(ast.left, context);
        const right = this.evaluate(ast.right, context);

        // arithmetic
        if (op === '+') return Number(left ?? 0) + Number(right ?? 0);
        if (op === '-') return Number(left ?? 0) - Number(right ?? 0);
        if (op === '*') return Number(left ?? 0) * Number(right ?? 0);
        if (op === '%') return Number(left ?? 0) % Number(right ?? 0);
        if (op === '/') {
          const r = Number(right ?? 0);
          if (r === 0) {
            console.warn('Interpreter: division by zero');
            return null;
          }
          return Number(left ?? 0) / r;
        }

        // comparison
        if (op === '==') return left === right;
        if (op === '!=') return left !== right;
        if (op === '<')  return Number(left) < Number(right);
        if (op === '<=') return Number(left) <= Number(right);
        if (op === '>')  return Number(left) > Number(right);
        if (op === '>=') return Number(left) >= Number(right);

        return null;
      }

      case 'conditional': {
        const cond = this.evaluate(ast.condition, context);
        return cond ? this.evaluate(ast.consequent, context) : this.evaluate(ast.alternate, context);
      }

      case 'call': {
        const args = ast.args.map(arg => this.evaluate(arg, context));
        return this.functions.call(ast.name, args);
      }
    }
  }
}
