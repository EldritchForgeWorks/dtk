import type { ActorSnapshot } from './ActorSnapshot.js'

export interface ResolvedTarget {
  readonly actorId: string
  readonly tokenId: string
  readonly snapshot: ActorSnapshot
}
