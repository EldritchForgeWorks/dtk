## Why

Requested by: DTK Officina change init-m0-delivery-skeleton (M0).

`systema.defineSystem(modus)` (`packages/systema/src/define-system/index.ts`, exposed via the module API in `src/registration/systema-api.ts`) is the documented entry point for system authors — but it has **no real consumer**. Verified: `packages/shadowrun/src/` contains zero references to `defineSystem` or `dtk-systema`; `src/index.ts` instead assigns `CONFIG.Actor.dataModels['dtk-shadowrun.shadowrunCharacter']` and calls `Actors.registerSheet(...)` directly inside its own `Hooks.on('init')` handler, bypassing systema entirely. Officina-generated systems will be the **first** code path ever to exercise `defineSystem` end-to-end — an unacceptable place to discover integration bugs. The path must be exercised inside this repo before external systems depend on it.

## What Changes

Module: `dtk-systema` (FREE tier), consumer: `dtk-shadowrun` (example system). Contract: Modus (system wiring — the `defineSystem` input).

- **Convert dtk-shadowrun to `defineSystem`** (primary): replace the direct `CONFIG.Actor.dataModels` / `Actors.registerSheet` registration in `packages/shadowrun/src/index.ts` with a Modus declaration passed to `game.modules.get('dtk-systema').api.defineSystem(modus)` during shadowrun's `init` hook, making shadowrun the reference consumer. `dtk-systema` becomes a required relationship in shadowrun's `module.json`.
- **Automated smoke test** (domain level): a Vitest test that feeds a full, realistic Modus (modeled on shadowrun's actor/sheet needs) through `SystemRegistrar.build(modus)` and asserts the resulting descriptor — validating the domain half of `defineSystem` without a live Foundry instance, per the house rule that `adapters/foundry/` is smoke-tested only.
- **Manual Foundry smoke checklist**: enable dtk-systema + dtk-shadowrun in Foundry, confirm the actor type, data model, and sheet registered via systema behave identically to the previous direct registration (init-window guard included: calling after init throws `SystemaError`).
- If conversion surfaces gaps in `defineSystem` (e.g. sheet options shadowrun needs that Modus cannot express), file them as follow-up changes rather than widening this one.

## Non-goals

- No new `defineSystem` features or Modus schema changes.
- No changes to shadowrun's visual behaviour, theme, or dice-chat integration — registration path only.
- No CI-driven live-Foundry test harness (manual smoke checklist for the Foundry adapter layer).

## Capabilities

### New Capabilities

*(none)*

### Modified Capabilities

- `define-system`: added requirement that `defineSystem` is exercised by an in-repo reference consumer and a domain-level smoke test.

## Impact

- `packages/shadowrun/src/index.ts` (registration rewrite), `packages/shadowrun/module.json` (`dtk-systema` moves into `relationships.requires`), new Modus declaration file in shadowrun.
- `packages/systema/tests/` gains the full-Modus smoke test.
- **Downstream**: Officina generates systems against a `defineSystem` path proven by a real consumer (U4).
