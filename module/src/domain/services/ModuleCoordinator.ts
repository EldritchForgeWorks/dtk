import { DtkModuleEntry } from '../entities/DtkModuleEntry'

export class ModuleCoordinator {
  private readonly entries = new Map<string, DtkModuleEntry>()

  register(entry: DtkModuleEntry): void {
    if (this.entries.has(entry.id)) {
      console.warn(`[dtk] ModuleCoordinator: duplicate registration for "${entry.id}" — overwriting`)
    }
    this.entries.set(entry.id, entry)
  }

  markReady(moduleId: string): void {
    this.entries.get(moduleId)?.markReady()
  }

  allReady(): boolean {
    for (const entry of this.entries.values()) {
      if (!entry.ready) return false
    }
    return true
  }

  getApi<T>(moduleId: string): T | undefined {
    return this.entries.get(moduleId)?.api as T | undefined
  }

  isInstalled(moduleId: string): boolean {
    return this.entries.has(moduleId)
  }

  getRegistered(): ReadonlyMap<string, DtkModuleEntry> {
    return this.entries
  }

  pendingModules(): string[] {
    return [...this.entries.values()]
      .filter(e => !e.ready)
      .map(e => e.id)
  }
}
