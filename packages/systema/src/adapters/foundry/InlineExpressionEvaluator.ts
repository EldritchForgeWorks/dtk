import type { IExpressionEvaluator, EvaluationContext } from '../../ports/IExpressionEvaluator.js'

const SIMPLE_PATTERN = /^@[\w.]+\s*(>|>=|<|<=|==|!=)\s*.+$|^!@[\w.]+$|^@[\w.]+$/

export class InlineExpressionEvaluator implements IExpressionEvaluator {
  canEvaluate(expression: string): boolean {
    return SIMPLE_PATTERN.test(expression.trim())
  }

  evaluate(expression: string, context: EvaluationContext): unknown {
    // Delegate to the same logic as ConditionEvaluator's inline path
    const trimmed = expression.trim()

    const negMatch = /^!@([\w.]+)$/.exec(trimmed)
    if (negMatch) {
      const val = this.resolvePath(context, (negMatch[1] ?? '').split('.'))
      return !val
    }

    const compMatch = /^@([\w.]+)\s*(>|>=|<|<=|==|!=)\s*(.+)$/.exec(trimmed)
    if (compMatch) {
      const [, pathStr, op, rawValue] = compMatch
      const left = this.resolvePath(context, (pathStr ?? '').split('.'))
      const right = this.parseValue((rawValue ?? '').trim())
      return this.compare(left, op ?? '', right)
    }

    const truthyMatch = /^@([\w.]+)$/.exec(trimmed)
    if (truthyMatch) {
      return Boolean(this.resolvePath(context, (truthyMatch[1] ?? '').split('.')))
    }

    return true
  }

  private resolvePath(obj: unknown, path: string[]): unknown {
    let current: unknown = obj
    for (const key of path) {
      if (current === null || current === undefined) return undefined
      if (typeof current !== 'object') return undefined
      current = (current as Record<string, unknown>)[key]
    }
    return current
  }

  private parseValue(raw: string): unknown {
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      return raw.slice(1, -1)
    }
    if (raw === 'true') return true
    if (raw === 'false') return false
    const num = Number(raw)
    if (!isNaN(num)) return num
    return raw
  }

  private compare(left: unknown, op: string, right: unknown): boolean {
    switch (op) {
      case '>': return Number(left) > Number(right)
      case '>=': return Number(left) >= Number(right)
      case '<': return Number(left) < Number(right)
      case '<=': return Number(left) <= Number(right)
      // eslint-disable-next-line eqeqeq
      case '==': return left == right
      // eslint-disable-next-line eqeqeq
      case '!=': return left != right
      default: return false
    }
  }
}
