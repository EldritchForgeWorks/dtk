import type { IActionExecutor } from '../../ports/IActionExecutor.js'
import type { RollContext } from '../../domain/value-objects/RollContext.js'

export interface ExecuteCall {
  context: RollContext
}

export interface ResumeCall {
  sequenceId: string
  choice: string
}

export class StubActionExecutor implements IActionExecutor {
  readonly executeCalls: ExecuteCall[] = []
  readonly resumeCalls: ResumeCall[] = []
  private available = true

  setAvailable(v: boolean): this {
    this.available = v
    return this
  }

  async execute(context: RollContext): Promise<void> {
    this.executeCalls.push({ context })
  }

  async resume(sequenceId: string, choice: string): Promise<void> {
    this.resumeCalls.push({ sequenceId, choice })
  }

  isAvailable(): boolean {
    return this.available
  }
}
