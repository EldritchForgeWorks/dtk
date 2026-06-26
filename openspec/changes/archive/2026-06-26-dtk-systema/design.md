## Context

dtk-systema is the integration layer between Foundry VTT and the rest of the DTK
ecosystem. Its prototype is the `systema` module in the reference repo. The key shift
from prototype to DTK design: the prototype wired hardcoded TypeScript hooks; dtk-systema
wires everything from a `Modus` contract declared in `@dtk/types`. The game system
author writes no Foundry boilerplate — only a Modus YAML/JSON and a one-line
`defineSystem(modus)` call.

The module has five distinct responsibilities, each cleanly bounded:

```
 Game System Author
       │
       ▼
 defineSystem(modus)          ← Modus contract from @dtk/types
       │
       ├── registers actors, items, data models, settings (Foundry init)
       │
 controlToken hook
       │
       ▼
 ActionMenu (ApplicationV2)   ← reads actor's resolved action Exemplars
       │ click
       ▼
 Targeting                    ← canvas selection / template / self / none
       │ resolved targets
       ▼
 ContextBuilder               ← assembles RollContext for dtk-alea
       │ RollContext
       ▼
 dtk-alea.execute()           ← dice engine (separate module)
       │
       │ dtk-alea.await hook (if sequence suspends)
       ▼
 AwaitRelay                   ← decision dialog + socket relay + Combat flags
       │ choice
       ▼
 dtk-alea.resume()
```

## Goals / Non-Goals

**Goals:**
- Zero-boilerplate game system bootstrap via `defineSystem(modus)`
- Action menu that derives its content entirely from compendium Exemplars (no hardcoded actions)
- Full targeting lifecycle owned by systema; dtk-alea receives only a resolved list
- RollContext assembled and validated before dtk-alea is ever called
- Await/relay that works across network boundaries and survives disconnect

**Non-Goals:**
- Dice rolling, sequence execution, or expression evaluation (dtk-alea)
- Compendium compilation or NL generation (dtk-promptuarium)
- Character creation wizard (dtk-opus)
- Condition expression evaluation beyond simple field lookups (dtk-lex, when installed)
- Any Foundry v11 or legacy Application patterns

## Decisions

### D1: defineSystem() runs on the Foundry init hook

`defineSystem(modus: Modus)` is called by the game system's own module from its `init`
hook handler. Systema validates the Modus via `@dtk/types` Zod schema on receipt, then
performs 14 registration steps (actors, items, data models, compendium packs, settings,
hooks, socket listener, `game.dtk.register()` call).

**Change from prototype**: The prototype's `defineSystem()` wired hardcoded TypeScript
`poolBuilder`/`onComplete` hooks. DTK's version derives everything from the Modus
contract; no TypeScript hooks are accepted.

**Why init:** Foundry requires actor/item registration before `setup`. Calling after
`ready` would miss the registration window entirely.

---

### D2: Action menu is a per-token ApplicationV2 sidebar panel

The action menu is an `ApplicationV2` (with `HandlebarsApplicationMixin`) that opens
when a token is controlled (`Hooks.on('controlToken')`). It is positioned as a floating
panel adjacent to the selected token's HUD rather than embedded in the actor sheet.
Closing occurs on deselect or Escape.

Actions displayed = the actor's resolved Exemplar grants of `kind: "action"` from the
compendium. Systema reads these from the actor's flags (populated at character
creation/advancement by dtk-promptuarium's output) rather than querying the compendium
at runtime.

Action condition evaluation: systema uses a minimal inline evaluator for action
`condition` fields (simple field lookups like `@actor.ammo > 0`). When dtk-lex is
installed, systema delegates to `LexApi.evaluate()` for complex conditions. Actions
with false conditions are rendered greyed/disabled, not hidden.

**Why floating panel not sheet:** The actor sheet may be closed; actions should be
accessible directly from the canvas without opening a sheet. Matches the "play at the
table" interaction model.

---

### D3: Targeting owns the full canvas lifecycle, dtk-alea receives a list

Systema intercepts the action execution before dtk-alea is called. The targeting
workflow runs to completion (user selects tokens or places template), builds a
`ResolvedTarget[]` array, then passes it into the RollContext. dtk-alea never touches
canvas hooks or `MeasuredTemplate`.

Targeting modes:
```
token  → Hooks.on('targetToken') listener; enforces min/max; filter via expression
self   → [{ actor: initiatingActor, token: initiatingToken }]  (no UI)
area   → MeasuredTemplate.create(); collect tokens in template; cleanup after
none   → []
```

For `per-target` execution mode, systema calls dtk-alea once per resolved target,
feeding each target's context separately. For `once` execution mode, systema calls
dtk-alea once with the full target array in context.

**Why systema owns this:** dtk-alea is a pure executor — canvas access in the dice
engine would break its testability and its ability to run outside Foundry (e.g., in
Node.js for compendium compilation). Decision D17 from dtk-types/design.md.

---

### D4: RollContext assembled from Foundry documents and Combat state

The `ContextBuilder` reads:
- `actor.system` — the actor's data model fields (attributes, skills, resources)
- `activeItem` — the item document the action was triggered from (if any)
- `targets` — the resolved target list from targeting
- `combat` — `game.combat?.current` (round, turn, combatant id); null outside combat
- `stepInputs` — any `@steps.{id}.{field}` values already resolved in prior steps
  (populated by dtk-alea and passed back via the await hook payload)

The assembled object is validated against the `RollContext` interface from
`@dtk/types/apis` before being passed to `AleaApi.roll()`. Validation failure surfaces
as a Foundry error notification; execution does not proceed.

---

### D5: Await relay uses gmRelay socket pattern with Combat flags persistence

When dtk-alea suspends on an `await` step it fires:
```
Hooks.callAll('dtk-alea.await', {
  sequenceId: string,
  stepId: string,
  choices: Choice[],
  actorId: string,         // who must decide
  timeout?: number,
  default?: string
})
```

Systema's flow on receiving this hook:

```
1. Write pending state to Combat.flags['dtk-alea'][sequenceId]
   (persists to Foundry DB; survives disconnect)

2. Is actorId owned by current user?
   YES → render DecisionDialog locally
   NO  → emit Foundry socket message { type: 'dtk-systema.decision-request', ... }
         GM receives; GM relays to correct player via socket

3. Player responds (or timeout fires)
   → systema emits { type: 'dtk-systema.decision-response', sequenceId, choice }
   → GM (or current user if local) calls game.dtk.api<AleaApi>('dtk-alea').resume(sequenceId, choice)

4. Clear Combat.flags['dtk-alea'][sequenceId]
```

Reconnect recovery: on `ready` hook, systema checks `Combat.flags['dtk-alea']` for
pending sequences owned by a connected actor. If found and not expired, it re-renders
the decision dialog.

**Why GM relay:** Non-GM players can't emit arbitrary socket messages to other players
in Foundry's security model. The GM client acts as a trusted relay. This is the
standard Foundry pattern for cross-player socket communication.

---

### D6: Systema registers with game.dtk and exposes SystemaApi

On `init`, dtk-systema calls `game.dtk.register({ id: 'dtk-systema', version, api })`.
The `api` object implements `SystemaApi` from `@dtk/types/apis`:
- `defineSystem(modus: Modus): void`
- `version: string`
- `isReady: boolean`

On async init completion, systema fires `Hooks.callAll('dtk-systema.ready')`.

## Risks / Trade-offs

- **controlToken hook fires on every token click** → Mitigation: guard on
  `token.actor?.system` existence and DTK system flag; bail early if not a DTK actor
- **MeasuredTemplate cleanup on abort** → Mitigation: store template id in targeting
  state; delete on cancel, Escape, or targeting timeout
- **Socket relay latency for player decisions** → Mitigation: decision dialog shows
  a countdown; default choice fires on timeout so sequences don't hang indefinitely
- **Lex not installed — complex conditions always pass** → Mitigation: log a console
  warning when a condition expression is too complex for the inline evaluator; action
  is rendered available (fail-open) not greyed; Lex installation resolves this
- **defineSystem() called after init window closes** → Mitigation: detect and throw a
  descriptive error: "defineSystem() must be called from the system's init hook"

## Open Questions

- Q1: Should the action menu auto-open on token control, or require an explicit button
  click on the token HUD? Auto-open is friendlier but may conflict with other modules
  that add HUD elements. Recommended: auto-open with a module setting to disable.
- Q2: Per-target sequential execution — should each target's sequence complete before
  the next begins, or should they be fanned out in parallel? Sequential is simpler and
  matches traditional TTRPG resolution; parallel would require complex state management.
  Recommended: sequential.

---

## Module Architecture

dtk-systema has the richest domain of any free-tier module — five distinct domain
services, six ports, and two adapter sets. The hexagonal split is essential here
because most domain logic (targeting, context building, await coordination) must be
unit-testable without Foundry globals.

```
src/
├── domain/
│   ├── entities/
│   │   ├── ActionContext.ts         in-flight action (actionId, sequenceId, phase)
│   │   └── PendingDecision.ts       aggregate root for an awaited player decision
│   ├── value-objects/
│   │   ├── ResolvedTarget.ts        { actorId, tokenId, systemSnapshot }
│   │   ├── ActorSnapshot.ts         immutable copy of actor.system at execution time
│   │   └── CombatSnapshot.ts        { round, turn, combatantId } | null
│   └── services/
│       ├── ContextBuilder.ts        assembles RollContext from snapshots + inputs
│       ├── ConditionEvaluator.ts    inline @actor.field evaluator; Lex delegate
│       ├── TargetingResolver.ts     dispatches by mode; enforces min/max/filter
│       ├── ActionLoader.ts          reads actor flags → fetches Exemplar data
│       └── AwaitCoordinator.ts      manages PendingDecision lifecycle + timeout
├── ports/
│   ├── IActorRepository.ts          getSnapshot(actorId) → ActorSnapshot
│   ├── ICombatStateStore.ts         read/write Combat.flags['dtk-alea']
│   ├── ISocketRelay.ts              send(type, payload) / onReceive(type, handler)
│   ├── ITemplateManager.ts          create(spec) → templateId; delete(templateId)
│   ├── IExpressionEvaluator.ts      evaluate(expr, context) → unknown
│   └── IActionExecutor.ts           execute(context) / resume(sequenceId, choice)
└── adapters/
    ├── foundry/
    │   ├── FoundryActorRepository.ts      game.actors.get() → ActorSnapshot
    │   ├── FoundryCombatStateStore.ts     combat.setFlag() / getFlag()
    │   ├── FoundrySocketRelay.ts          game.socket.emit() / on()
    │   ├── FoundryTemplateManager.ts      MeasuredTemplate.create() / delete()
    │   ├── LexExpressionEvaluator.ts      delegates to LexApi when installed
    │   ├── InlineExpressionEvaluator.ts   simple @field.path parser (no Lex)
    │   └── AleaActionExecutor.ts          game.dtk.api('dtk-alea').execute/resume
    └── in-memory/
        ├── InMemoryActorRepository.ts     Map<id, ActorSnapshot>
        ├── InMemoryCombatStateStore.ts    Map<sequenceId, PendingPayload>
        ├── StubSocketRelay.ts             records sent messages; fires handlers
        ├── StubTemplateManager.ts         returns synthetic templateId; spy on delete
        ├── StubExpressionEvaluator.ts     configurable return value per expression
        └── StubActionExecutor.ts          records execute/resume calls
```

**Port ↔ Adapter mapping:**

| Port | Foundry Adapter | In-Memory Stub |
|---|---|---|
| `IActorRepository` | `FoundryActorRepository` | `InMemoryActorRepository` |
| `ICombatStateStore` | `FoundryCombatStateStore` | `InMemoryCombatStateStore` |
| `ISocketRelay` | `FoundrySocketRelay` | `StubSocketRelay` |
| `ITemplateManager` | `FoundryTemplateManager` | `StubTemplateManager` |
| `IExpressionEvaluator` | `LexExpressionEvaluator` / `InlineExpressionEvaluator` | `StubExpressionEvaluator` |
| `IActionExecutor` | `AleaActionExecutor` | `StubActionExecutor` |

**Key domain invariants:**
- `ContextBuilder` never reads a Foundry Document; it receives `ActorSnapshot` value objects via `IActorRepository`
- `TargetingResolver` never touches canvas globals; it calls `ITemplateManager` for template ops and receives token ids via `IActorRepository`
- `AwaitCoordinator` persists state exclusively through `ICombatStateStore`; it never calls `combat.setFlag()` directly
- `PendingDecision` is the aggregate root for all await state; no other service mutates Combat flags directly

**VitestSuite targets:**
- `src/domain/` + `src/ports/` — 85%+ statement coverage
- `src/adapters/in-memory/` — 100% (these are stubs; every path must be exercisable)
- `src/adapters/foundry/` — excluded from coverage; covered by smoke test group 8
