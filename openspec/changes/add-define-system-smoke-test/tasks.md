## 1. Domain smoke test in dtk-systema

- [ ] 1.1 [test] Write Vitest smoke test: build a full realistic Modus (shadowrun-shaped: one Actor type with data schema + sheet declaration) and assert `SystemRegistrar.build(modus)` produces a complete descriptor (data model keys, sheet registrations, settings)
- [ ] 1.2 [test] Assert the init-window guard: `defineSystem` outside the init window throws `SystemaError` with the documented message

## 2. Convert dtk-shadowrun to defineSystem

- [ ] 2.1 [impl] Author shadowrun's Modus declaration covering `shadowrunCharacter` (data model + `ShadowrunCharacterSheet` + default flag) — validate it against the `@dtk/types` Modus schema in a unit test
- [ ] 2.2 [impl] Replace direct `CONFIG.Actor.dataModels` / `Actors.registerSheet` calls in `packages/shadowrun/src/index.ts` with `game.modules.get('dtk-systema').api.defineSystem(modus)` in the `init` hook; keep `registerTheme()` and `listenForDiceStep()` unchanged
- [ ] 2.3 [wire] Move `dtk-systema` into `relationships.requires` in `packages/shadowrun/module.json`
- [ ] 2.4 If Modus cannot express something shadowrun needs, record the gap and file a follow-up change (do not extend Modus here)

## 3. Foundry smoke verification (manual)

- [ ] 3.1 [smoke] Enable dtk + dtk-systema + dtk-shadowrun; F5; no console errors during init
- [ ] 3.2 [smoke] Create a `shadowrunCharacter` actor; confirm data model fields present and `ShadowrunCharacterSheet` opens as default
- [ ] 3.3 [smoke] Confirm `dtk-systema.ready` hook fires and `game.dtk` reports systema registered
- [ ] 3.4 [smoke] Dice-chat flow (`listenForDiceStep`) still works after the registration rewrite
