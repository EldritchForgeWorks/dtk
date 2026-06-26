export interface ActorSnapshot {
  readonly actorId: string
  readonly tokenId: string | null
  readonly name: string
  readonly system: Readonly<Record<string, unknown>>
  readonly flags: Readonly<Record<string, unknown>>
  readonly actionIds: readonly string[]
}
