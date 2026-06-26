import type { ILexDelegate } from '../ports/ILexDelegate'
import type { Forma } from './Forma'
import type { CharacterBuild } from './CharacterBuild'

export interface EvalContext {
  steps: Record<string, unknown>
  actor?: Record<string, unknown>
  advancements?: string[]
}

function resolveRef(ref: string, context: EvalContext): unknown {
  if (ref.startsWith('@steps.')) {
    const rest = ref.slice('@steps.'.length)
    const dotIndex = rest.indexOf('.')
    if (dotIndex === -1) return undefined
    const stepId = rest.slice(0, dotIndex)
    const field = rest.slice(dotIndex + 1)
    const stepValue = context.steps[stepId]
    if (stepValue === undefined || stepValue === null) return undefined
    if (field === 'choice') return stepValue
    if (typeof stepValue === 'object') {
      return (stepValue as Record<string, unknown>)[field]
    }
    return undefined
  }
  if (ref.startsWith('@actor.')) {
    if (!context.actor) return undefined
    const parts = ref.slice('@actor.'.length).split('.')
    let current: unknown = context.actor
    for (const part of parts) {
      if (current === null || current === undefined) return undefined
      current = (current as Record<string, unknown>)[part]
    }
    return current
  }
  return undefined
}

function isSimpleAtom(expr: string): boolean {
  const t = expr.trim()
  return (
    /^@steps\.\w+\.\w+\s*(==|!=|>=|<=|>|<)\s*/.test(t) ||
    /^@build\.advancements\.includes\(/.test(t) ||
    /^@actor\..+\s*(==|!=|>=|<=|>|<)\s*/.test(t)
  )
}

function isComplexExpression(expr: string): boolean {
  const t = expr.trim()
  // function-call syntax that is NOT the @build.advancements.includes pattern
  return /\w+\s*\(/.test(t) && !/^@build\.advancements\.includes\(/.test(t)
}

function evaluateAtom(expr: string, context: EvalContext): boolean {
  const t = expr.trim()

  const includesMatch = t.match(/^@build\.advancements\.includes\(['"](.+)['"]\)$/)
  if (includesMatch) {
    return context.advancements?.includes(includesMatch[1]) ?? false
  }

  const compMatch = t.match(/^(@\S+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/)
  if (!compMatch) return false

  const refStr = compMatch[1]
  const op = compMatch[2]
  const literalStr = compMatch[3].trim()

  const refValue = resolveRef(refStr, context)

  let literalValue: unknown
  if (
    (literalStr.startsWith("'") && literalStr.endsWith("'")) ||
    (literalStr.startsWith('"') && literalStr.endsWith('"'))
  ) {
    literalValue = literalStr.slice(1, -1)
  } else if (!isNaN(Number(literalStr))) {
    literalValue = Number(literalStr)
  } else {
    literalValue = literalStr
  }

  switch (op) {
    case '==': return refValue === literalValue
    case '!=': return refValue !== literalValue
    case '>=': return Number(refValue) >= Number(literalValue)
    case '<=': return Number(refValue) <= Number(literalValue)
    case '>':  return Number(refValue) > Number(literalValue)
    case '<':  return Number(refValue) < Number(literalValue)
    default:   return false
  }
}

function splitTopLevel(expr: string, operator: string): string[] {
  const results: string[] = []
  let depth = 0
  let current = ''
  let i = 0
  while (i < expr.length) {
    if (expr[i] === '(') depth++
    else if (expr[i] === ')') depth--

    if (depth === 0 && expr.slice(i, i + operator.length) === operator) {
      results.push(current)
      current = ''
      i += operator.length
      continue
    }
    current += expr[i]
    i++
  }
  results.push(current)
  return results
}

export class PrerequisiteEvaluator {
  constructor(private lexDelegate: ILexDelegate | null) {}

  evaluate(expression: string, context: EvalContext): boolean {
    if (!expression || expression.trim() === '') return true

    const trimmed = expression.trim()

    if (isComplexExpression(trimmed)) {
      if (this.lexDelegate !== null) {
        const ctx: Record<string, unknown> = { ...context.steps, ...(context.actor ?? {}) }
        const result = this.lexDelegate.evaluate(expression, ctx)
        if (result === null) {
          console.warn(`dtk-opus: dtk-lex returned null for "${expression}", treating as satisfied`)
          return true
        }
        return Boolean(result)
      }
      console.warn(`dtk-opus: complex expression requires dtk-lex: "${expression}", treating as satisfied`)
      return true
    }

    if (trimmed.includes('||')) {
      return splitTopLevel(trimmed, '||').some(p => this.evaluate(p.trim(), context))
    }

    if (trimmed.includes('&&')) {
      return splitTopLevel(trimmed, '&&').every(p => this.evaluate(p.trim(), context))
    }

    if (!isSimpleAtom(trimmed)) {
      if (this.lexDelegate !== null) {
        const ctx: Record<string, unknown> = { ...context.steps, ...(context.actor ?? {}) }
        const result = this.lexDelegate.evaluate(expression, ctx)
        if (result === null) {
          console.warn(`dtk-opus: dtk-lex returned null for "${expression}", treating as satisfied`)
          return true
        }
        return Boolean(result)
      }
      console.warn(`dtk-opus: cannot evaluate expression "${expression}", treating as satisfied`)
      return true
    }

    return evaluateAtom(trimmed, context)
  }

  evaluateAll(forma: Forma, build: CharacterBuild): Record<string, boolean> {
    const result: Record<string, boolean> = {}
    const config = forma.advancement
    const context: EvalContext = {
      steps: build.steps,
      advancements: build.advancements.map(a => a.id),
    }

    for (const track of config.tracks) {
      try {
        result[track.id] = track.requires
          ? this.evaluate(track.requires, context)
          : true
      } catch {
        result[track.id] = true
      }
    }
    return result
  }
}
