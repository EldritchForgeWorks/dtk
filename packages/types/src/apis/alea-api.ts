export interface ActionContext {
  systemId: string
  initiatorId: string
  targetIds: string[]
  itemId?: string
  combatId?: string
  stepOutputs?: Record<string, RollResult | null>
}

export interface RollResult {
  hits: number
  opposedHits: number | null
  netHits: number
  tier: string
  faces: number[]
  pool: number
}

export interface SequenceExecution {
  sequenceId: string
  exemplarId: string
  stepIndex: number
  stepOutputs: Record<string, RollResult | null>
  context: ActionContext
  suspendedAt?: number
  status: 'running' | 'suspended' | 'complete'
}

export interface AleaApi {
  registerRitus(ritus: unknown): void
  registerSequence(sequence: unknown): void
  execute(sequenceId: string, context: ActionContext): Promise<SequenceExecution>
  resume(sequenceId: string, choice: string | null): Promise<SequenceExecution>
  readonly isReady: boolean
}
