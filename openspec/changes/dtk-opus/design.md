# Design: dtk-opus

## Decisions

### 1. Forma schema is registered per system id via OpusApi

`OpusApi.registerForma(systemId, forma)` accepts a `Forma` object from
`@dtk/types/forma`. The Forma declares creation steps, advancement paradigm config, and advancement tracks.
It is stored in `FormaRegistry` keyed by `systemId`.

A world may have only one active Forma per system at a time. Re-registration overwrites
and logs a warning (same pattern as RitusRegistry in dtk-alea).

### 2. Creation wizard is a multi-step ApplicationV2 modal

The wizard is implemented as a `HandlebarsApplicationMixin(ApplicationV2)` modal
dialog. Each step in `forma.steps[]` renders as a page — step navigation uses the
`ApplicationV2` tabs API. Steps are rendered in declaration order.

Choice rendering is driven by step type:
- `choices: { from: "species" | "archetype" | ... }` — renders a card grid populated from `game.dtk.api<PromptariumApi>('dtk-promptuarium')?.query(kind)`
- `spend_on: "attributes"` — renders a point-buy allocator
- `spend_on: "skills"` — renders a ranked skill list
- `free_text` — renders an input field

The wizard resolves a Promise with the completed `CharacterBuild` when the user clicks
Finish. The calling code (game system's actor sheet) uses this build to populate the
actor's data.

### 3. Prerequisite evaluation — built-in evaluator with optional Lex delegation

Prerequisites are expressions in Forma YAML:

```yaml
- id: shadowrunner-discipline
  requires: "@steps.archetype.choice == 'street-samurai'"
```

dtk-opus ships a **simple prerequisite evaluator** covering:
- Equality/inequality against literal strings and numbers
- Step output references (`@steps.{id}.{field}`)
- `&&` and `||` composition

Complex prerequisites (function calls, custom lookups) delegate to
`game.dtk.api<LexApi>('dtk-lex')?.evaluate()` when dtk-lex is installed. If dtk-lex
is absent and the expression is beyond the simple evaluator's capability, the
prerequisite is treated as **always satisfied** and a console warning is logged.
This ensures dtk-opus works without dtk-lex — it just can't enforce complex rules.

### 4. Advancement paradigm is a discriminated union in the Forma

The Forma declares one `advancement.paradigm` that governs how the tracker determines
when the player may purchase advancements:

```yaml
# XP-based — spend an accumulated numeric pool
advancement:
  paradigm: xp
  currency: "Karma"         # display label; default "XP"
  starting: 400             # initial pool on new character

# Milestone-based — GM triggers advancement events via OpusApi.triggerMilestone()
advancement:
  paradigm: milestone
  per_milestone: 3          # advancements unlocked per milestone event

# Resource-based — spend an in-world resource tracked as an actor field
advancement:
  paradigm: resource
  resource: "@actor.system.wealth.gold"
  currency: "Gold"

# Practice/use-based — abilities mark when used; checked at session end for improvement
advancement:
  paradigm: practice
  check_at: session_end     # when improvement rolls are triggered
  check_expression: "@uses >= 1"   # what constitutes a use

# Marks/tally — accumulate session marks; spend them to buy advancements
advancement:
  paradigm: marks
  marks_per_session: 2      # marks earned automatically each session
  currency: "Marks"

# Session-based — automatic advancement after N sessions
advancement:
  paradigm: session
  sessions_per_advance: 1   # frequency of automatic advancement opportunity
```

The `AdvancementEngine` dispatches to a paradigm-specific strategy based on the
Forma's declared `advancement.paradigm`. All six paradigms share the same
`availableAdvancements()` and `purchase()` surface — only the "gate" (what lets the
player buy) differs.

**Practice-based** is architecturally distinct: it requires session-scoped use-tracking.
`CharacterBuild.practiceLog` is a Record of `{ abilityId → useCount }` reset on each
session-end hook. The improvement check expression is evaluated against this log.

### 5. Advancement tracker is a separate ApplicationV2 panel

Character advancement (XP spending, ability selection) is a distinct panel from the
creation wizard — opened from the actor sheet header button when `OpusApi` is available.

The tracker reads the actor's current build state from `actor.flags['dtk-opus']` and
presents available advancements from the registered Forma's `advancementTracks`. Each
advancement shows its prerequisites, XP cost, and a Buy button. Buying writes to
`actor.flags['dtk-opus']` via `Actor#update`.

The tracker never writes to `actor.system` directly — it records the canonical build in
flags and leaves system field mapping to the game system's own derivation hooks.

### 6. CharacterBuild is the aggregate root stored in actor flags

`CharacterBuild` is a value object (serialisable plain object) stored as
`actor.flags['dtk-opus'].build`. It records:
- `systemId` — which game system this build is for
- `steps` — Record of step id → chosen value(s)
- `advancements` — Array of purchased advancement ids with timestamps
- `paradigmState` — paradigm-specific accumulator; shape varies by paradigm:
  - `xp`: `{ currency: "Karma", total: 400, spent: 50 }`
  - `milestone`: `{ milestonesGranted: 2, advancementsRemaining: 3 }`
  - `resource`: `{ currency: "Gold" }` (balance read live from actor field)
  - `practice`: `{ practiceLog: Record<abilityId, useCount> }` (reset each session)
  - `marks`: `{ currency: "Marks", total: 8, spent: 6 }`
  - `session`: `{ sessionsCompleted: 3, advancementsRemaining: 1 }`

The build is the single source of truth. Downstream system data derivation reads from
this structure. `paradigmState` is typed narrowly as `ParadigmState<P>` where `P` is
the Forma's declared paradigm — the engine never mutates the wrong fields.

### 7. OpusApi exposed via game.dtk

`OpusApi` implements `@dtk/types/apis#OpusApi`:
- `registerForma(systemId, forma)` — register a Forma schema
- `openCreationWizard(actor, systemId)` — returns `Promise<CharacterBuild | null>`
- `openAdvancementTracker(actor)` — opens the advancement panel (no return value)
- `getBuild(actor)` — returns the current `CharacterBuild` from actor flags or null
- `isReady` — boolean

---

## Module Architecture

### Domain (pure TypeScript, no Foundry globals)

```
src/domain/
  Forma.ts                  — mirrors @dtk/types/forma schema shape (no Zod dependency in domain)
  FormaRegistry.ts          — service: Map<systemId, Forma>; register, get
  CharacterBuild.ts         — value object: systemId, steps, advancements, xpSpent, xpTotal
  CreationEngine.ts         — service: walks Forma.steps, applies choices, returns partial CharacterBuild
  PrerequisiteEvaluator.ts  — service: built-in simple eval + ILexDelegate optional delegation
  AdvancementEngine.ts      — service: computes available advancements, validates XP, applies purchase
```

### Ports

```
src/ports/
  IActorBuildStore.ts    — read/write CharacterBuild to actor flags
  IExemplarQuery.ts      — query available Exemplars by kind (populated from dtk-promptuarium)
  ILexDelegate.ts        — evaluate complex expression via dtk-lex; optional (null when absent)
  IWizardRenderer.ts     — render creation wizard UI; resolves Promise<CharacterBuild | null>
  ITrackerRenderer.ts    — render advancement tracker UI; no return
```

### Adapters

```
src/adapters/foundry/
  FoundryActorBuildStore.ts   — reads/writes actor.flags['dtk-opus'] via Actor#update
  FoundryExemplarQuery.ts     — calls game.dtk.api<PromptariumApi>('dtk-promptuarium')?.query(kind)
  LexDelegateAdapter.ts       — calls game.dtk.api<LexApi>('dtk-lex')?.evaluate(); null if absent
  CreationWizardApp.ts        — HandlebarsApplicationMixin(ApplicationV2) multi-step modal
  AdvancementTrackerApp.ts    — ApplicationV2 actor-sheet panel
src/adapters/in-memory/
  InMemoryActorBuildStore.ts  — Map<actorId, CharacterBuild>
  StubExemplarQuery.ts        — returns fixture Exemplars by kind
  NullLexDelegate.ts          — always returns null (tests the graceful-degradation path)
  NullWizardRenderer.ts       — immediately resolves with a fixture CharacterBuild
  NullTrackerRenderer.ts      — no-op
```

### Bounded Context Invariants

- `CreationEngine` and `AdvancementEngine` never read Foundry globals; they receive plain objects via ports
- `CharacterBuild` is a serialisable value object — no class instances, no Foundry Documents
- `PrerequisiteEvaluator` degrades gracefully when `ILexDelegate` is null — never throws
- Both ApplicationV2 apps live entirely in `adapters/foundry/` — never imported by domain/
