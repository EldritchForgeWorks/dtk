import type { ActorSnapshot } from './ActorSnapshot.js'
import type { ResolvedTarget } from './ResolvedTarget.js'
import type { MaybeCombatSnapshot } from './CombatSnapshot.js'

export interface RollContext {
  readonly initiator: ActorSnapshot
  readonly targets: readonly ResolvedTarget[]
  readonly actionId: string
  readonly itemId: string | null
  readonly combat: MaybeCombatSnapshot
  readonly stepInputs: Readonly<Record<string, unknown>>
}

export function validateRollContext(ctx: unknown): ctx is RollContext {
  if (typeof ctx !== 'object' || ctx === null) return false
  const c = ctx as Record<string, unknown>
  if (typeof c['actionId'] !== 'string' || c['actionId'].length === 0) return false
  if (typeof c['initiator'] !== 'object' || c['initiator'] === null) return false
  const initiator = c['initiator'] as Record<string, unknown>
  if (typeof initiator['actorId'] !== 'string') return false
  if (!Array.isArray(c['targets'])) return false
  if (!('itemId' in c)) return false
  if (!('combat' in c)) return false
  if (typeof c['stepInputs'] !== 'object' || c['stepInputs'] === null) return false
  return true
}
