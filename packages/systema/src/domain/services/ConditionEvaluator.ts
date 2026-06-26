import type { IExpressionEvaluator, EvaluationContext } from '../../ports/IExpressionEvaluator.js'

const SIMPLE_COMPARISON = /^@([\w.]+)\s*(>=|<=|==|!=|>|<)\s*(.+)$/
const SIMPLE_NEGATION = /^!@([\w.]+)$/
const SIMPLE_TRUTHY = /^@([\w.]+)$/

export class ConditionEvaluator {
  constructor(private readonly lexEvaluator: IExpressionEvaluator | null) {}

  evaluate(expression: string, context: EvaluationContext): boolean {
    const trimmed = expression.trim()
    if (!trimmed || trimmed === 'true') return true
    if (trimmed === 'false') return false

    const inline = this.evaluateInline(trimmed, context)
    if (inline !== null) return inline

    if (this.lexEvaluator) {
      const result = this.lexEvaluator.evaluate(trimmed, context)
      return Boolean(result)
    }

    console.warn(
      `dtk-systema: condition "${trimmed}" is too complex for inline evaluation and dtk-lex is not available. Defaulting to true.`,
    )
    return true
  }

  private evaluateInline(expression: string, context: EvaluationContext): boolean | null {
    const negMatch = SIMPLE_NEGATION.exec(expression)
    if (negMatch) {
      const path = negMatch[1]
      if (!path) return null
      const val = this.resolvePath(context, path.split('.'))
      return !val
    }

    const truthyMatch = SIMPLE_TRUTHY.exec(expression)
    if (truthyMatch) {
      const path = truthyMatch[1]
      if (!path) return null
      const val = this.resolvePath(context, path.split('.'))
      return Boolean(val)
    }

    const compMatch = SIMPLE_COMPARISON.exec(expression)
    if (compMatch) {
      const [, pathStr, operator, rawValue] = compMatch
      if (!pathStr || !operator || rawValue === undefined) return null

      const leftVal = this.resolvePath(context, pathStr.split('.'))
      const rightVal = this.parseValue(rawValue.trim())

      return this.compare(leftVal, operator, rightVal)
    }

    return null
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
    if (raw.startsWith('"') && raw.endsWith('"')) return raw.slice(1, -1)
    if (raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1)
    if (raw === 'true') return true
    if (raw === 'false') return false
    if (raw === 'null') return null
    const num = Number(raw)
    if (!isNaN(num)) return num
    return raw
  }

  private compare(left: unknown, op: string, right: unknown): boolean {
    switch (op) {
      case '>':
        return Number(left) > Number(right)
      case '>=':
        return Number(left) >= Number(right)
      case '<':
        return Number(left) < Number(right)
      case '<=':
        return Number(left) <= Number(right)
      case '==':
        // eslint-disable-next-line eqeqeq
        return left == right
      case '!=':
        // eslint-disable-next-line eqeqeq
        return left != right
      default:
        return false
    }
  }
}
