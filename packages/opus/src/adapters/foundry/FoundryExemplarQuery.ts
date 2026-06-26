// @ts-nocheck — references Foundry VTT globals unavailable in this compilation target
import type { IExemplarQuery, Exemplar } from '../../ports/IExemplarQuery'

export class FoundryExemplarQuery implements IExemplarQuery {
  async query(kind: string): Promise<Exemplar[]> {
    const promptuarium = game.dtk?.api?.('dtk-promptuarium')
    if (!promptuarium) return []
    try {
      const results = await promptuarium.query(kind)
      return Array.isArray(results) ? results : []
    } catch {
      return []
    }
  }
}
