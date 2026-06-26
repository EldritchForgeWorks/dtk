## 0. Architecture Scaffold

> dtk-systema has the richest domain in the free tier — five domain services, six
> ports, and two adapter sets. The hex split is critical: targeting, context building,
> and await coordination must be unit-testable without any Foundry globals.
> TDD: each `#### Scenario:` maps 1:1 to a named `it()`. Coverage: 85%+ on `src/domain/`.

- [x] 0.1 [wire] Create `src/domain/entities/`, `src/domain/value-objects/`, `src/domain/services/`
- [x] 0.2 [wire] Create `src/ports/` for six port interfaces
- [x] 0.3 [wire] Create `src/adapters/foundry/` and `src/adapters/in-memory/`
- [x] 0.4 [wire] Create `tests/unit/domain/`, `tests/unit/ports/`, `tests/unit/helpers/`, `tests/smoke/`
- [x] 0.5 [wire] Configure `vitest.config.ts` — exclude `src/adapters/foundry/**` and `tests/smoke/**`; 85%+ on `src/domain/`; 100% on `src/adapters/in-memory/`
- [x] 0.6 [wire] Write `tests/unit/helpers/fixtures.ts` — factories for `ActorSnapshot`, `ResolvedTarget`, `RollContext`, `PendingDecision`, `ActionExemplar` test stubs
- [x] 0.7 [port]  Declare all six port interfaces in `src/ports/`: `IActorRepository`, `ICombatStateStore`, `ISocketRelay`, `ITemplateManager`, `IExpressionEvaluator`, `IActionExecutor`
- [x] 0.8 [stub]  Write all six in-memory adapters in `src/adapters/in-memory/`: `InMemoryActorRepository`, `InMemoryCombatStateStore`, `StubSocketRelay`, `StubTemplateManager`, `StubExpressionEvaluator`, `StubActionExecutor`

## 1. Module Scaffold

- [x] 1.1 [wire] Create `module.json` (id: `dtk-systema`, requires `dtk`, optional `dtk-alea`/`dtk-lex`, compatibility v12–v14)
- [x] 1.2 [wire] Configure `package.json` with Vite build, TypeScript 5+, Vitest, `@dtk/types` as devDependency
- [x] 1.3 [wire] Configure `tsconfig.json` (strict, ESNext, bundler moduleResolution, fvtt-types devDependency)
- [x] 1.4 [wire] Set up `vite.config.ts` bundling `src/index.ts` → `module/dtk-systema.js`, copying Handlebars templates
- [x] 1.5 [wire] Write `src/index.ts` — entry point; wires all subsystems on `Hooks.on('init')` and `Hooks.on('ready')`

## 2. game.dtk Registration

- [x] 2.1 [test]  Write failing Vitest tests for `SystemaApi` — `defineSystem` callable, `isReady` false before init, true after; `dtk-systema.ready` fires after registration
- [x] 2.2 [impl]  Write `src/registration/systema-api.ts` — implements `SystemaApi` from `@dtk/types/apis` (`defineSystem`, `version`, `isReady`)
- [x] 2.3 [wire]  Wire `game.dtk.register({ id: 'dtk-systema', version, api })` in the `init` hook handler
- [x] 2.4 [wire]  Wire `Hooks.callAll('dtk-systema.ready')` after all async registration steps complete

## 3. defineSystem Implementation

- [x] 3.1 [test]  Write failing Vitest tests for all define-system/spec.md scenarios (Modus validation, late-call error, actor type registration, item type registration, settings registration, Ritus/Codex optional wiring)
- [x] 3.2 [impl]  Write `src/domain/services/SystemRegistrar.ts` — pure registration logic: validates Modus, collects actor/item/settings declarations; no Foundry globals
- [x] 3.3 [adapt] Write `src/adapters/foundry/FoundrySystemRegistrar.ts` — calls `CONFIG.Actor.dataModels`, `CONFIG.Item.dataModels`, `game.settings.register()` from SystemRegistrar output
- [x] 3.4 [impl]  Write `src/define-system/index.ts` — `defineSystem(modus)` entry point; validates Modus, detects late calls, delegates to `FoundrySystemRegistrar`
- [x] 3.5 [impl]  Write `src/define-system/register-optional.ts` — wires `modus.ritus` → dtk-alea and `modus.codex` → dtk-lex on their `.ready` hooks; no-op if absent

## 4. Action Menu

- [x] 4.1 [test]  Write failing Vitest tests for all action-menu/spec.md scenarios (condition evaluation: true/false/absent/Lex-delegate, empty state, pending lock, re-render on actor update)
- [x] 4.2 [impl]  Write `src/domain/services/ConditionEvaluator.ts` — inline `@actor.field` evaluator; receives `IExpressionEvaluator` port for Lex delegation; fail-open with warning
- [x] 4.3 [impl]  Write `src/domain/services/ActionLoader.ts` — reads `actor.flags['dtk-systema'].actions`; fetches Exemplar data via `IActorRepository`; returns `ActionExemplar[]`
- [x] 4.4 [adapt] Write `src/adapters/foundry/ActionMenuApp.ts` — `ApplicationV2` + `HandlebarsApplicationMixin`; GM-only open guard; pending-state lock; re-render on actor update hook
- [x] 4.5 [impl]  Write `templates/action-menu.hbs` — available/greyed action entries; spinner state
- [x] 4.6 [wire]  Register `controlToken` hook in `src/index.ts` to open/close/replace `ActionMenuApp`
- [x] 4.7 [wire]  Register `updateActor` hook to re-render open `ActionMenuApp` in place

## 5. Targeting

- [x] 5.1 [test]  Write failing Vitest tests for all targeting/spec.md scenarios (each mode, min/max enforcement, filter, cancel rejection, per-target vs once dispatch; all via port stubs)
- [x] 5.2 [impl]  Write `src/domain/value-objects/ResolvedTarget.ts` — `{ actorId, tokenId }`
- [x] 5.3 [impl]  Write `src/domain/services/TargetingResolver.ts` — pure dispatcher: receives mode + `IActorRepository` + `ITemplateManager` + `IExpressionEvaluator`; returns `Promise<ResolvedTarget[]>`
- [x] 5.4 [impl]  Write targeting mode implementations inside `TargetingResolver`: self (sync), none (sync), token (min/max/filter loop), area (template → collect → delete)
- [x] 5.5 [adapt] Write `src/adapters/foundry/FoundryTokenSelector.ts` — canvas `targetToken` hook listener; "Confirm targets" HUD element; Escape handler
- [x] 5.6 [adapt] Write `src/adapters/foundry/FoundryTemplateManager.ts` — `MeasuredTemplate.create()` / `delete()`; implements `ITemplateManager`
- [x] 5.7 [wire]  Wire `execution` dispatch (`per-target` sequential vs `once`) in `src/define-system/index.ts` action trigger path

## 6. Context Builder

- [x] 6.1 [test]  Write failing Vitest tests for all context-builder/spec.md scenarios (full context, null combat, target system data, stepInputs merge, missing dtk-alea warning)
- [x] 6.2 [impl]  Write `src/domain/services/ContextBuilder.ts` — `build(opts): RollContext`; receives snapshots from `IActorRepository` and combat from `ICombatStateStore`; pure function
- [x] 6.3 [impl]  Write `src/domain/value-objects/ActorSnapshot.ts`, `CombatSnapshot.ts`, `RollContext.ts` — all `Readonly<>`
- [x] 6.4 [adapt] Write `src/adapters/foundry/FoundryActorRepository.ts` — `game.actors.get()` → `ActorSnapshot`; `structuredClone(doc.system)` for immutable copy
- [x] 6.5 [adapt] Write `src/adapters/foundry/FoundryCombatStateStore.ts` — `game.combat` → `CombatSnapshot`; implements `ICombatStateStore`
- [x] 6.6 [wire]  Validate assembled `RollContext` before handing to `IActionExecutor`; surface Foundry error notification on failure; no-op with warning when dtk-alea absent

## 7. Await Relay

- [x] 7.1 [test]  Write failing Vitest tests for all await-relay/spec.md scenarios (hook triggers flag write, local dialog, GM relay routing, timeout with/without default, reconnect recovery, stale entry cleanup; all via `InMemoryCombatStateStore` and `StubSocketRelay`)
- [x] 7.2 [impl]  Write `src/domain/entities/PendingDecision.ts` — aggregate root: sequenceId (identity), choices, actorId, pendingAt, timeout, default
- [x] 7.3 [impl]  Write `src/domain/services/AwaitCoordinator.ts` — `handleAwait(payload)`, `handleResponse(sequenceId, choice)`, `recoverPending(store)` — pure; delegates persistence to `ICombatStateStore`, relay to `ISocketRelay`, execution to `IActionExecutor`
- [x] 7.4 [adapt] Write `src/adapters/foundry/FoundrySocketRelay.ts` — `game.socket.emit()` / `on()` with typed message envelopes; implements `ISocketRelay`
- [x] 7.5 [adapt] Write `src/adapters/foundry/DecisionDialog.ts` — `ApplicationV2` choice dialog; countdown timer; calls `IActionExecutor.resume()` on selection
- [x] 7.6 [adapt] Write `src/adapters/foundry/AleaActionExecutor.ts` — `game.dtk.api<AleaApi>('dtk-alea').execute/resume`; implements `IActionExecutor`
- [x] 7.7 [wire]  Register `Hooks.on('dtk-alea.await', ...)` in `src/index.ts`; wire socket handler for `decision-request`, `decision-relay`, `decision-response`
- [x] 7.8 [wire]  Register `ready` hook handler to call `AwaitCoordinator.recoverPending(store)` for reconnect recovery

## 8. Integration Smoke Tests

- [x] 8.1 [smoke] Build and install `dtk-systema` alongside `dtk` hub; verify `game.dtk.modules.get('dtk-systema')` is populated and `isReady` is true
- [x] 8.2 [smoke] Create minimal test game system calling `defineSystem(modus)` with one actor type; verify actor creation and sheet render in Foundry
- [x] 8.3 [smoke] Add a `kind: "action"` Exemplar with `targeting: { mode: "self" }` to the test actor; verify action menu opens on token control and action is listed
- [x] 8.4 [smoke] Click the self-targeting action; verify `RollContext` is assembled and `dtk-alea` (or a `StubActionExecutor`) is called with the correct context shape
- [x] 8.5 [smoke] Trigger an await step from a stub sequence; verify `Combat.flags` written, decision dialog appears, and `AleaApi.resume` is called on choice
