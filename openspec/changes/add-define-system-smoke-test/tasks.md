## 1. Domain smoke test in dtk-systema

- [x] 1.1 [test] Write Vitest smoke test: build a full realistic Modus (shadowrun-shaped: one Actor type with data schema + sheet declaration) and assert `SystemRegistrar.build(modus)` produces a complete descriptor (data model keys, sheet registrations, settings) — `packages/systema/tests/unit/domain/services/SystemRegistrar.smoke.test.ts`. NOTE: "sheet registrations" is asserted only to the extent Modus can express it today (it cannot — see gap below); the test asserts data model + settings, and documents the sheet gap inline.
- [x] 1.2 [test] Assert the init-window guard: `defineSystem` outside the init window throws `SystemaError` with the documented message — `packages/systema/tests/unit/define-system/defineSystem.test.ts`

BONUS FINDING + FIX (not originally scoped, but blocking): static analysis of the
init-window lifecycle found that `setInitWindowOpen(false)` was called at the end of
dtk-systema's *own* `Hooks.once('init', ...)` callback (`packages/systema/src/index.ts`).
Foundry dispatches `Hooks.callAll('init')` synchronously to every registered listener in
module-load order; since consumer modules (e.g. dtk-shadowrun) load after dtk-systema,
their own `Hooks.on('init', ...)` handlers always ran *after* dtk-systema's had already
closed the window — meaning `defineSystem()` would throw `SystemaError` for every real
external caller, unconditionally. Fixed by moving `setInitWindowOpen(false)` to
dtk-systema's `Hooks.once('ready', ...)` handler instead, so the window stays open for the
whole init phase (systema + all consumers) and only closes once init is fully done. This
was necessary for task 2 below to be possible at all.

## 2. Convert dtk-shadowrun to defineSystem

- [x] 2.1 [impl] Author shadowrun's Modus declaration covering `shadowrunCharacter` (data model) — validated against the `@eldritchforgeworks/dtk-types` Modus schema in a unit test (`packages/shadowrun/tests/modus.test.ts`, new minimal vitest setup added to the shadowrun package). Declaration does NOT cover the sheet/default-flag — see gap below; Modus cannot express it yet.
- [x] 2.2 [impl] Replaced direct `CONFIG.Actor.dataModels` assignment in `packages/shadowrun/src/index.ts` with `game.dtk?.api('dtk-systema')?.defineSystem(shadowrunModus)` in the `init` hook (actual cross-module accessor is `game.dtk.api(id)`, not `game.modules.get(id).api` — the latter isn't how this repo wires module APIs; see `packages/systema/src/registration/systema-api.ts` + `module/src/index.ts`). `registerTheme()` and `listenForDiceStep()` unchanged. `Actors.registerSheet(...)` call KEPT as direct Foundry registration (see gap below) — everything else routes through defineSystem.
- [x] 2.3 [wire] Moved `dtk-systema` into `relationships.requires` in `packages/shadowrun/module.json`
- [x] 2.4 Gap recorded: Modus/ActorTypeConfigSchema has no `sheet`/`sheetOptions` field, so `Actors.registerSheet` cannot be folded into `defineSystem(modus)` yet. Filed as follow-up change `add-modus-sheet-declaration` (not implemented here, per instruction not to extend Modus in this change).

## 3. Foundry smoke verification (manual)

- [ ] 3.1 [smoke] Enable dtk + dtk-systema + dtk-shadowrun; F5; no console errors during init — MANUAL, requires a live Foundry session; not run by this pass. Given the init-window fix above, this is the step that would have caught the bug live; pay particular attention to console errors around `defineSystem`/`SystemaError` on first load.
- [ ] 3.2 [smoke] Create a `shadowrunCharacter` actor; confirm data model fields present and `ShadowrunCharacterSheet` opens as default — MANUAL, not run by this pass.
- [ ] 3.3 [smoke] Confirm `dtk-systema.ready` hook fires and `game.dtk` reports systema registered — MANUAL, not run by this pass.
- [ ] 3.4 [smoke] Dice-chat flow (`listenForDiceStep`) still works after the registration rewrite — MANUAL, not run by this pass.
