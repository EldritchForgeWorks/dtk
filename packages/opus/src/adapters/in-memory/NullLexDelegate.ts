import type { ILexDelegate } from '../../ports/ILexDelegate'

export class NullLexDelegate implements ILexDelegate {
  evaluate(_expression: string, _context: Record<string, unknown>): boolean | null {
    return null
  }
}
