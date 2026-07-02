import type { Modus } from '@eldritchforgeworks/dtk-types'

export function registerOptionalModules(modus: Modus): void {
  if (modus.ritus) {
    const ritus = modus.ritus
    Hooks.once('dtk-alea.ready', () => {
      const dtk = (game as { dtk?: { api?: <T>(id: string) => T | undefined } }).dtk
      const alea = dtk?.api?.('dtk-alea') as
        | { registerRitus?: (r: unknown) => void }
        | undefined
      if (alea?.registerRitus) {
        alea.registerRitus(ritus)
      } else {
        console.info('dtk-systema: dtk-alea not available; skipping Ritus registration')
      }
    })
  }

  if (modus.codex) {
    const codex = modus.codex
    Hooks.once('dtk-lex.ready', () => {
      const dtk = (game as { dtk?: { api?: <T>(id: string) => T | undefined } }).dtk
      const lex = dtk?.api?.('dtk-lex') as
        | { registerPlugin?: (c: unknown) => void }
        | undefined
      if (lex?.registerPlugin) {
        lex.registerPlugin(codex)
      } else {
        console.info('dtk-systema: dtk-lex not available; skipping Codex registration')
      }
    })
  }
}
