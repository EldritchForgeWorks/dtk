export interface DtkModuleEntry {
  id: string
  version: string
  api: unknown
  ready: boolean
}

export interface DtkHubApi {
  register(entry: Omit<DtkModuleEntry, 'ready'>): void
  api<T>(moduleId: string): T | undefined
  isInstalled(moduleId: string): boolean
  readonly modules: ReadonlyMap<string, DtkModuleEntry>
  readonly version: string
  readonly isReady: boolean
}
