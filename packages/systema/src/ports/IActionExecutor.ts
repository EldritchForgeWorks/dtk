import type { RollContext } from '../domain/value-objects/RollContext.js'

export interface IActionExecutor {
  execute(context: RollContext): Promise<void>
  resume(sequenceId: string, choice: string): Promise<void>
  isAvailable(): boolean
}
