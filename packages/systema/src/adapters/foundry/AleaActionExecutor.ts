import type { IActionExecutor } from '../../ports/IActionExecutor.js'
import type { RollContext } from '../../domain/value-objects/RollContext.js'

interface AleaApi {
  execute(sequenceId: string, context: unknown): Promise<unknown>
  resume(sequenceId: string, choice: string | null): Promise<unknown>
}

function getAlea(): AleaApi | undefined {
  const dtk = (game as { dtk?: { api?: <T>(id: string) => T | undefined } }).dtk
  return dtk?.api?.<AleaApi>('dtk-alea')
}

export class AleaActionExecutor implements IActionExecutor {
  isAvailable(): boolean {
    return getAlea() !== undefined
  }

  async execute(context: RollContext): Promise<void> {
    const alea = getAlea()
    if (!alea) throw new Error('dtk-alea not available')
    await alea.execute(context.actionId, context)
  }

  async resume(sequenceId: string, choice: string): Promise<void> {
    const alea = getAlea()
    if (!alea) throw new Error('dtk-alea not available')
    await alea.resume(sequenceId, choice)
  }
}
