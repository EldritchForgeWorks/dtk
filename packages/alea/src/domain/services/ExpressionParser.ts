import type {
  EvaluationContext,
  IExpressionDelegate,
} from '../../ports/IExpressionDelegate.js';

const COMPLEX_PATTERN = /if\s*\(|&&|\|\||!|['"`]|\w+\s*\(/;

function resolvePath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur === null || cur === undefined) return null;
    if (typeof cur !== 'object') return null;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur ?? null;
}

function resolveScope(ref: string, ctx: EvaluationContext): unknown {
  const dot = ref.indexOf('.');
  if (dot === -1) return null;
  const scope = ref.slice(0, dot);
  const path = ref.slice(dot + 1);

  switch (scope) {
    case 'initiator':
      return resolvePath(ctx.initiator, path);
    case 'target':
      return ctx.target ? resolvePath(ctx.target, path) : null;
    case 'item':
      return ctx.item ? resolvePath(ctx.item, path) : null;
    case 'combat':
      return ctx.combat ? resolvePath(ctx.combat, path) : null;
    case 'steps': {
      const secondDot = path.indexOf('.');
      if (secondDot === -1) return null;
      const stepId = path.slice(0, secondDot);
      const field = path.slice(secondDot + 1);
      const stepOut = ctx.stepOutputs.get(stepId);
      if (stepOut === undefined || stepOut === null) return null;
      return resolvePath(stepOut, field);
    }
    default:
      return null;
  }
}

function applyArithmetic(
  expr: string,
  ctx: EvaluationContext,
): number | null {
  // Tokenise into values and operators with precedence
  const re = /@[\w.]+|[+\-*/]|[\d]+(?:\.[\d]+)?/g;
  const values: (number | null)[] = [];
  const ops: string[] = [];
  let lastEnd = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(expr)) !== null) {
    const gap = expr.slice(lastEnd, match.index).trim();
    if (gap) return null;
    lastEnd = match.index + match[0].length;
    const raw = match[0];

    if (['+', '-', '*', '/'].includes(raw)) {
      ops.push(raw);
    } else if (raw.startsWith('@')) {
      const v = resolveScope(raw.slice(1), ctx);
      values.push(typeof v === 'number' ? v : null);
    } else {
      values.push(parseFloat(raw));
    }
  }

  const tail = expr.slice(lastEnd).trim();
  if (tail) return null;

  if (values.some((v) => v === null)) return null;
  const nums = values as number[];

  if (nums.length !== ops.length + 1) return null;

  // Evaluate * and / first (precedence)
  const v2 = [...nums];
  const o2 = [...ops];
  let i = 0;
  while (i < o2.length) {
    if (o2[i] === '*' || o2[i] === '/') {
      if (o2[i] === '/' && v2[i + 1] === 0) {
        console.warn(`ExpressionParser: division by zero in "${expr}"`);
        return null;
      }
      const result = o2[i] === '*' ? v2[i] * v2[i + 1] : v2[i] / v2[i + 1];
      v2.splice(i, 2, result);
      o2.splice(i, 1);
    } else {
      i++;
    }
  }

  // Evaluate + and -
  let acc = v2[0];
  for (let j = 0; j < o2.length; j++) {
    if (o2[j] === '+') acc += v2[j + 1];
    else acc -= v2[j + 1];
  }

  return acc;
}

export class ExpressionParser {
  private readonly delegate: IExpressionDelegate | undefined;

  constructor(delegate?: IExpressionDelegate) {
    this.delegate = delegate;
  }

  evaluate(expression: string, context: EvaluationContext): number | null {
    const trimmed = expression.trim();

    // Pure numeric literal
    const literal = parseFloat(trimmed);
    if (!isNaN(literal) && String(literal) === trimmed) return literal;

    // Complex expression — delegate or warn
    if (COMPLEX_PATTERN.test(trimmed)) {
      if (this.delegate) {
        const result = this.delegate.evaluate(trimmed, context);
        return typeof result === 'number' ? result : null;
      }
      console.warn(
        `ExpressionParser: unsupported complex expression "${trimmed}" — install dtk-lex to evaluate.`,
      );
      return null;
    }

    // Single @scope.path reference
    if (/^@[\w.]+$/.test(trimmed)) {
      const v = resolveScope(trimmed.slice(1), context);
      return typeof v === 'number' ? v : null;
    }

    // Arithmetic expression
    return applyArithmetic(trimmed, context);
  }

  evaluatePool(expression: string, context: EvaluationContext): number {
    const result = this.evaluate(expression, context);
    if (typeof result !== 'number' || isNaN(result)) return 0;
    return Math.max(0, Math.floor(result));
  }

  resolveAny(expression: string, context: EvaluationContext): unknown {
    const trimmed = expression.trim();
    const literal = parseFloat(trimmed);
    if (!isNaN(literal) && String(literal) === trimmed) return literal;
    if (/^@[\w.]+$/.test(trimmed)) {
      return resolveScope(trimmed.slice(1), context);
    }
    return this.evaluate(expression, context);
  }
}
