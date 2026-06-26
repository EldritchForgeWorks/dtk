import type { DtkHubApi } from './hub-api.js'

declare const window: { game?: { dtk?: DtkHubApi } } | undefined

export function getDtkModuleApi<T>(moduleId: string): T | undefined {
  // Runtime stub — actual implementation provided by dtk-hub
  if (typeof window !== 'undefined' && window.game?.dtk) {
    return window.game.dtk.api<T>(moduleId)
  }
  return undefined
}

export function isDtkModuleInstalled(moduleId: string): boolean {
  if (typeof window !== 'undefined' && window.game?.dtk) {
    return window.game.dtk.isInstalled(moduleId)
  }
  return false
}
