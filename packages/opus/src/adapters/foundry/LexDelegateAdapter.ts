// @ts-nocheck — references Foundry VTT globals unavailable in this compilation target
import type { ILexDelegate } from '../../ports/ILexDelegate'

export class LexDelegateAdapter implements ILexDelegate {
  evaluate(expression: string, context: Record<string, unknown>): boolean | null {
    const lex = game.dtk?.api?.('dtk-lex')
    if (!lex) return null
    try {
      const result = lex.evaluate(expression, context)
      if (result === null || result === undefined) return null
      return Boolean(result)
    } catch {
      return null
    }
  }
}
