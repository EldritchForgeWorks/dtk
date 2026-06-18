# Tasks: dtk-alea

## Group 0: Architecture Scaffold

- [ ] [wire] Create hexagonal directory structure: `src/domain/`, `src/ports/`, `src/adapters/foundry/`, `src/adapters/in-memory/`
- [ ] [wire] Configure vitest with `coverage.exclude: ["src/adapters/foundry/**"]` and `coverage.thresholds: { lines: 85 }`
- [ ] [wire] Create `tests/` directory with `fixtures/` and `helpers/` subdirectories
- [ ] [wire] Declare all four port interfaces in `src/ports/`: `IDiceRoller`, `ICombatStateStore`, `IHookEmitter`, `IExpressionDelegate`
- [ ] [wire] Write all four in-memory stubs in `src/adapters/in-memory/`: `DeterministicDiceRoller`, `InMemoryCombatStateStore`, `SpyHookEmitter`, `NullExpressionDelegate`
- [ ] [wire] Create test fixture factory `tests/fixtures/ritus.ts` with `makeSr5eRitus()`, `makeSimpleRitus()` helpers
- [ ] [wire] Create test fixture factory `tests/fixtures/exemplar.ts` with `makeRuleExemplar()`, `makeSequenceExemplar()`, `makeActionExemplar()`

---

## Group 1: RitusRegistry [ritus-registry]

- [ ] [test] Write `RitusRegistry` unit tests covering: valid registration, duplicate overwrite + warning, invalid schema throws, id lookup hit, id lookup miss, per-rule threshold override applied, absent override preserves base value (4 groups: Boundary/Scenario/Failure/Combinatorial)
- [ ] [impl] Implement `RitusRegistry` domain service: `Map<string, RitusConfig>` backing store; `register()` validates via `RitusSchema.safeParse()`, warns + overwrites on duplicate; `get()` returns config or null; `resolve(id, overrides)` merges overrides without mutating stored config
- [ ] [impl] Implement `AleaApi.registerRitus()` as a thin delegation to `RitusRegistry.register()`

---

## Group 2: ExpressionParser [expression-parser]

- [ ] [test] Write `ExpressionParser` unit tests covering: `@initiator` scope resolution, `@steps` cross-step reference, unknown path → null, skipped step → null, arithmetic (+/-/*/÷) with precedence, division by zero → null + warning, delegation to `IExpressionDelegate` when present, delegation absent → null + warning, float pool coercion, null pool coercion (4 groups)
- [ ] [impl] Implement `ExpressionParser` domain service: scope registry pattern; `evaluate(expr, context): number | null`; arithmetic parser using standard precedence; `IExpressionDelegate` delegation fallback
- [ ] [impl] Implement `NullExpressionDelegate` stub (already in Group 0 — wire up in parser tests)

---

## Group 3: RollResolver [roll-resolver]

- [ ] [test] Write `RollResolver` unit tests covering: pool assembly from expression, negative pool → miss, null pool → miss + warning, hit counting against threshold, opposed roll net hits, net hits floored at zero, unopposed net hits = initiator hits, critical/hit/glancing/miss tier classification, `RollResult` shape for opposed and unopposed rolls (4 groups)
- [ ] [impl] Implement `TierResolver` value object: pure function `classify(netHits, ritusConfig): string`; breakpoint comparison logic; fallback to `"miss"` when no tier matches
- [ ] [impl] Implement `RollResolver` domain service: 6-stage pipeline (assemble → roll via `IDiceRoller` → count → oppose → net → classify via `TierResolver`); returns immutable `RollResult`
- [ ] [stub] Implement `DeterministicDiceRoller` stub (already in Group 0 — extend with face-list injection for deterministic tests)

---

## Group 4: SequenceExecutor [sequence-executor]

- [ ] [test] Write `SequenceExecutor` unit tests covering: all steps execute in order, step with false condition skipped, skipped step does not block next, await step calls `ICombatStateStore.save()` + `IHookEmitter.emit()` + stops, resume continues after await with choice, resume with null choice, on-tier damage formula evaluated, miss tier with no on_tier is no-op, `dtk-alea.complete` fires after last step, complete does not fire during suspension (4 groups)
- [ ] [impl] Implement `SequenceExecution` aggregate root: `sequenceId`, `stepIndex`, `stepOutputs: Map<string, RollResult | null>`, `context: ActionContext`, `suspendedAt?: string`; serialisable to/from JSON
- [ ] [impl] Implement `SequenceExecutor` domain service: step iteration; condition evaluation; dispatches to `RollResolver`; writes to `ICombatStateStore` on await; emits via `IHookEmitter`; applies `on_tier` consequences
- [ ] [impl] Implement `AleaApi.execute()` and `AleaApi.resume()` as entry points into `SequenceExecutor`

---

## Group 5: Foundry Adapters [adapt]

- [ ] [adapt] Implement `FoundryDiceRoller`: wraps `Roll` with face-list evaluation; `IDiceRoller` port
- [ ] [adapt] Implement `FoundryCombatStateStore`: reads/writes `game.combat.flags['dtk-alea']` via `setFlag`/`getFlag`; `ICombatStateStore` port
- [ ] [adapt] Implement `FoundryHookEmitter`: delegates to `Hooks.callAll`; `IHookEmitter` port
- [ ] [adapt] Implement `LexExpressionDelegate`: calls `game.dtk.api<LexApi>('dtk-lex')?.evaluate()` if dtk-lex is installed; returns null otherwise; `IExpressionDelegate` port

---

## Group 6: Combat Integration [combat-integration]

- [ ] [test] Write combat integration unit tests covering: queued sequence auto-executes on combatant turn, no queued entry is no-op, suspended entry not re-triggered, Foundry combat classes not replaced, queued entries cleared on round advance, suspended entries survive round advance (4 groups — use `SpyHookEmitter` + `InMemoryCombatStateStore`)
- [ ] [impl] Register `Hooks.on('combatTurn', handler)`: read flags, skip if no entry or status ≠ "queued", call `AleaApi.execute()`
- [ ] [impl] Register `Hooks.on('combatRound', handler)`: delete all `status: "queued"` entries from flags; leave `status: "suspended"` intact

---

## Group 7: Module Init & game.dtk Registration [wire]

- [ ] [wire] Implement `module/src/index.ts`: call `game.dtk.register({ id: 'dtk-alea', version, api: aleaApi })` in `init` hook; fire `Hooks.callAll('dtk-alea.ready')` after registration completes
- [ ] [wire] Wire all adapters together: construct `FoundryDiceRoller`, `FoundryCombatStateStore`, `FoundryHookEmitter`, `LexExpressionDelegate`; inject into `RitusRegistry`, `ExpressionParser`, `RollResolver`, `SequenceExecutor`
- [ ] [smoke] Manual smoke test: register a simple two-step sequence, execute it from the browser console via `game.dtk.api('dtk-alea').execute(...)`, verify `dtk-alea.complete` fires in hook log
