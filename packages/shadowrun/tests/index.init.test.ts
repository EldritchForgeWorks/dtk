// Regression test for the 2026-07-02 game.dtk.api(...) → getApi(...) bug
// (see modus.ts's header note). Stubs `game.dtk` matching the REAL runtime
// hub shape (module/src/index.ts: only `getApi`, `register`, `isInstalled`,
// `pendingModules` — no `.api()`), so a reintroduced call to the stale
// `.api()` name resolves to `undefined` here exactly as it would in a real
// Foundry session, and this test fails instead of silently passing.
import { beforeEach, describe, expect, it, vi } from 'vitest'

declare global {
  // eslint-disable-next-line no-var
  var Hooks: { on: (event: string, fn: () => void) => void }
  // eslint-disable-next-line no-var
  var Actors: { registerSheet: (...args: unknown[]) => void }
  // eslint-disable-next-line no-var
  var game: { dtk?: { getApi: (id: string) => unknown } }
}

describe('dtk-shadowrun init hook — real hub shape', () => {
  let initCallback: (() => void) | undefined
  const defineSystem = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    initCallback = undefined
    defineSystem.mockClear()

    globalThis.Hooks = {
      on: (event, fn) => {
        if (event === 'init') initCallback = fn
      },
    }
    globalThis.Actors = { registerSheet: vi.fn() }
    // Real hub shape: getApi only — matches dtk/module/src/index.ts exactly.
    // No `.api` property, so a stale `.api()` call site resolves to
    // "undefined is not a function", not a silent no-op.
    globalThis.game = { dtk: { getApi: () => ({ defineSystem }) } }
  })

  it('calls defineSystem via the real hub accessor (getApi, not api)', async () => {
    await import('../src/index.js')
    expect(initCallback).toBeDefined()
    initCallback?.()
    expect(defineSystem).toHaveBeenCalledTimes(1)
    expect(defineSystem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'dtk-shadowrun' }),
    )
  })

  it('warns instead of throwing when dtk-systema is not installed', async () => {
    globalThis.game = { dtk: { getApi: () => undefined } }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await import('../src/index.js')
    expect(() => initCallback?.()).not.toThrow()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
