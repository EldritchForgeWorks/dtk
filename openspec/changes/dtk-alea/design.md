## Context

dtk-alea is the dice execution engine for the DTK ecosystem. Its prototype is
`alea-core`. The key shift from prototype to DTK: the prototype used TypeScript
`poolBuilder` and `onComplete` hooks registered per schema. dtk-alea's design
receives fully-declarative Rule/Sequence Exemplars and executes them without any
TypeScript callbacks from the game system author.

dtk-alea is the purest expression of hexagonal architecture in the free tier: its
domain (roll resolution, sequence walking, expression parsing) has zero Foundry
coupling. Foundry adapters are thin: a dice roller, a Combat flag store, a hook
emitter.

```
AleaApi.execute(context)
       │
       ▼
SequenceExecutor            ← walks Sequence Exemplar step list
       │ per step
       ▼
RollResolver                ← pool expression → dice → hits → tier
       │
       ├── ExpressionParser ← @attr.path / arithmetic / @steps.x.y
       │   (or LexApi.evaluate() if lex installed)
       │
       ├── IDiceRoller      ← Roll class (Foundry) or deterministic stub (tests)
       │
       └── TierResolver     ← net hits → tier name via Ritus tiers config
               │
               ▼
       TierConsequence      ← damage formula, chain, effect, chat message
               │
               ▼
       IHookEmitter         ← dtk-alea.step / dtk-alea.await / dtk-alea.complete
```

## Goals / Non-Goals

**Goals:**
- Pure sequence execution: walk steps, roll, resolve tiers, apply consequences
- Expression parsing for pool strings and formula values (`@attr`, arithmetic)
- Await suspension: emit hook and suspend; resume on `AleaApi.resume()`
- Persist mid-sequence state in `Combat.flags['dtk-alea']`
- Enhance Foundry combat (hook listener) without replacing any Foundry class
- Testable without Foundry — deterministic dice roller adapter, in-memory state store

**Non-Goals:**
- Target selection or canvas interaction (dtk-systema)
- Action menu or UI of any kind
- Socket relay for player decisions (dtk-systema)
- Compendium compilation (dtk-promptuarium)
- Full expression DSL authoring or visual editor (dtk-lex)

## Decisions

### D1: SequenceExecution is the aggregate root

Each call to `AleaApi.execute()` creates a `SequenceExecution` entity with a unique
`sequenceId`. It owns all mutable state for one running sequence: current step index,
accumulated step outputs (`@steps.{id}` values), and suspension state. All reads and
writes to `ICombatStateStore` go through this aggregate — no other domain object
touches the store directly.

**Why:** Centralising state in one aggregate prevents partial writes. If a step fails,
the aggregate can be restored to its pre-step state before the failure propagates.

---

### D2: ExpressionParser is inline; Lex is an optional delegate

The inline parser handles: `@{scope}.{path}` references (`@initiator`, `@target`,
`@item`, `@combat`, `@steps`), numeric literals, and the four arithmetic operators
(`+`, `-`, `*`, `/`). Anything more complex (conditionals, function calls, logical
operators) is delegated to `IExpressionDelegate`, which wraps `LexApi.evaluate()`.

When dtk-lex is absent, complex expressions return `null` with a console warning.
Alea treats `null` pool results as a zero-die roll and emits `"pool-null"` on the
step output so the game system can handle it.

**Change from prototype**: prototype used `schema.poolBuilder(ctx)` TypeScript
functions. The inline parser replaces these entirely — no TypeScript callbacks accepted.

---

### D3: Six-stage roll resolution pipeline (per step)

For each Rule step, the RollResolver runs these stages in order:

```
1. Assemble   pool expression → die count (integer, via ExpressionParser)
2. Roll       IDiceRoller.roll(count, sides) → face values[]
3. Count      face values ≥ threshold → hits
4. Oppose     if opposed: same pipeline for opposition pool → opposition hits
5. Net        initiator hits - opposition hits → net hits (floor 0 for non-opposed)
6. Classify   net hits → tier name (via RitusRegistry + per-rule overrides)
```

The result is a `RollResult` value object: `{ hits, opposedHits, netHits, tier, faces, pool }`.

**Change from prototype**: prototype's `RollPipeline` had TypeScript stage hooks.
DTK replaces all hooks with declarative per-tier `on_tier` consequences in the Rule
Exemplar.

---

### D4: Await — suspend and emit, resume via AleaApi

When a sequence step has an `await` spec, the `SequenceExecutor`:
1. Writes current `SequenceExecution` state to `ICombatStateStore`
2. Emits `Hooks.callAll('dtk-alea.await', { sequenceId, stepId, choices, actorId, timeout?, default? })`
3. Returns without advancing to the next step

`AleaApi.resume(sequenceId, choice)` reads the `SequenceExecution` from the store,
records the choice in `stepOutputs['<stepId>.choice']`, and continues execution from
where it suspended.

dtk-alea does NOT listen for socket messages and does NOT render any UI. That is
dtk-systema's responsibility.

---

### D5: Combat.flags['dtk-alea'] — keyed by sequenceId

The serialised `SequenceExecution` shape stored per sequenceId:
```typescript
{
  sequenceId: string,
  exemplarId: string,       // Sequence Exemplar id
  stepIndex: number,        // next step to execute on resume
  stepOutputs: Record<string, unknown>,  // @steps.{id}.{field} values
  context: RollContext,     // the original context from dtk-systema
  suspendedAt?: number,     // timestamp if awaiting
}
```

dtk-alea never reads or writes any other key in `Combat.flags`. Entries are deleted on
`dtk-alea.complete` or when the combat round advances past the combatant's turn.

---

### D6: Combat integration — hook listener, not class override

dtk-alea registers `Hooks.on('combatTurn', handler)`. When a combatant's turn begins,
it checks `Combat.flags['dtk-alea']` for a queued sequence for that combatant. If
found and not yet started, it calls `AleaApi.execute()` automatically. If a sequence
is already in progress (resumed from suspension), it does nothing (resume is explicit).

dtk-alea never subclasses `Combat`, `Combatant`, or `CombatTracker`.

## Module Architecture

```
src/
├── domain/
│   ├── entities/
│   │   └── SequenceExecution.ts    aggregate root; owns all mid-run state
│   ├── value-objects/
│   │   ├── RollResult.ts           hits, netHits, tier, faces — immutable
│   │   ├── StepOutput.ts           one step's resolved outputs
│   │   └── RitusConfig.ts          registered Ritus snapshot (mechanic, threshold, tiers)
│   └── services/
│       ├── RitusRegistry.ts        stores registered Ritus configs by systemId
│       ├── ExpressionParser.ts     inline @ref + arithmetic parser
│       ├── RollResolver.ts         six-stage pipeline; receives IDiceRoller + IExpressionDelegate
│       ├── TierResolver.ts         net hits → tier name via RitusConfig + per-rule overrides
│       └── SequenceExecutor.ts     walks steps; dispatches to RollResolver; handles await
├── ports/
│   ├── IDiceRoller.ts              roll(count, sides) → number[]
│   ├── ICombatStateStore.ts        load/save/delete SequenceExecution by sequenceId
│   ├── IHookEmitter.ts             emit(hookName, payload) → void
│   └── IExpressionDelegate.ts     evaluate(expr, context) → unknown | null (Lex bridge)
└── adapters/
    ├── foundry/
    │   ├── FoundryDiceRoller.ts        new Roll(formula).evaluate() → face values
    │   ├── FoundryCombatStateStore.ts  combat.setFlag() / getFlag() / unsetFlag()
    │   ├── FoundryHookEmitter.ts       Hooks.callAll()
    │   └── LexExpressionDelegate.ts    game.dtk.api('dtk-lex')?.evaluate()
    └── in-memory/
        ├── DeterministicDiceRoller.ts  configurable fixed face sequences for tests
        ├── InMemoryCombatStateStore.ts Map<sequenceId, SequenceExecution>
        ├── SpyHookEmitter.ts           records emitted hooks for assertions
        └── NullExpressionDelegate.ts   returns null for all expressions
```

**Port ↔ Adapter mapping:**

| Port | Foundry Adapter | In-Memory Stub |
|---|---|---|
| `IDiceRoller` | `FoundryDiceRoller` | `DeterministicDiceRoller` |
| `ICombatStateStore` | `FoundryCombatStateStore` | `InMemoryCombatStateStore` |
| `IHookEmitter` | `FoundryHookEmitter` | `SpyHookEmitter` |
| `IExpressionDelegate` | `LexExpressionDelegate` | `NullExpressionDelegate` |

**VitestSuite targets:**
- `src/domain/` — 85%+ statement coverage (all logic testable with deterministic dice)
- `src/adapters/in-memory/` — 100%
- `src/adapters/foundry/` — excluded; covered by smoke test group

## Risks / Trade-offs

- **Foundry `Roll` class is async** → `FoundryDiceRoller` must await `.evaluate()`; domain receives synchronous results (the async boundary is contained in the adapter)
- **Complex pool expressions when Lex absent** → null pool treated as zero-die roll; emits warning; game system must handle gracefully
- **Combat flags size limit** → Foundry has no hard cap, but very long sequences with large context objects could hit document size issues; mitigation: store only a snapshot of `RollContext` fields actually referenced by the sequence

## Open Questions

- Q1: Should `dtk-alea.step` emit after every step, or only on significant steps (rolls, awaits, chain rolls)? Every step is noisier but gives Systema more visibility. Recommendation: every step that produces output.
- Q2: Chain rolls (named chains in Rule Exemplars) — should they create nested `SequenceExecution` entries or be resolved inline within the parent? Inline is simpler; nested would allow independent suspension. Recommendation: inline for now, nested as a future extension.
