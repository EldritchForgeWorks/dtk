// Minimal Foundry VTT global type stubs for TypeScript checking.
// The full runtime types are provided by Foundry VTT itself.

declare const Hooks: {
  on(event: string, fn: (...args: unknown[]) => unknown): number
  once(event: string, fn: (...args: unknown[]) => unknown): number
  off(event: string, hookId: number | ((...args: unknown[]) => unknown)): void
  callAll(event: string, ...args: unknown[]): boolean
}

declare const game: {
  actors?: { get(id: string): FoundryActorDocument | undefined }
  user?: { id: string; isGM: boolean }
  socket?: {
    emit(event: string, data: unknown): void
    on(event: string, fn: (data: unknown) => void): void
    off(event: string, fn: (data: unknown) => void): void
  }
  combat?: FoundryCombatDocument | null
  settings?: {
    register(namespace: string, key: string, config: unknown): void
    get(namespace: string, key: string): unknown
  }
  modules?: { get(id: string): { active: boolean } | undefined }
  dtk?: {
    api<T>(id: string): T | undefined
    register(entry: { id: string; version: string; api: unknown }): void
  }
}

declare const canvas: {
  tokens?: {
    get(id: string): FoundryTokenPlaceable | undefined
    placeables: FoundryTokenPlaceable[]
  }
  templates?: {
    get(id: string): FoundryMeasuredTemplatePlaceable | undefined
  }
}

declare const ui: {
  notifications?: {
    error(msg: string): void
    warn(msg: string): void
    info(msg: string): void
  }
}

declare const CONFIG: {
  Actor: { dataModels: Record<string, unknown> }
  Item: { dataModels: Record<string, unknown> }
}

declare const foundry: {
  applications: {
    api: {
      ApplicationV2: new (...args: unknown[]) => FoundryApplicationV2Instance
      HandlebarsApplicationMixin: (base: unknown) => unknown
    }
  }
}

declare const MeasuredTemplate: {
  create(data: unknown[]): Promise<unknown[]>
}

interface FoundryApplicationV2Instance {
  render(force?: boolean): void
  close(): void
  readonly rendered: boolean
}

interface FoundryCombatDocument {
  id: string | null
  started: boolean
  round: number | null
  turn: number | null
  combatant: { id: string | null } | null
  flags: Record<string, Record<string, unknown>>
  setFlag(namespace: string, key: string, value: unknown): Promise<void>
  getFlag(namespace: string, key: string): unknown
  unsetFlag(namespace: string, key: string): Promise<void>
}

interface FoundryActorDocument {
  id: string | null
  name: string
  system: Record<string, unknown>
  flags: Record<string, Record<string, unknown>>
  isOwner: boolean
}

interface FoundryTokenPlaceable {
  id: string | null
  actor: FoundryActorDocument | null
  x: number
  y: number
}

interface FoundryMeasuredTemplatePlaceable {
  id: string | null
  document: FoundryMeasuredTemplateDocument
  object?: { shape?: { contains(x: number, y: number): boolean } }
}

interface FoundryMeasuredTemplateDocument {
  id: string | null
  x: number
  y: number
  delete(): Promise<void>
}
