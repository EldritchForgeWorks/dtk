# Design: @dtk/types

## Context

Every DTK module (dtk-alea, dtk-lex, dtk-opus, dtk-systema, dtk-promptuarium)
needs the same contract shapes. Without a shared package the options are bad: each
module duplicates its own stubs (drift), or modules import from each other (circular
deps). `@dtk/types` is the neutral dependency — no module depends on another module,
only on this package.

The package must be usable in two distinct environments:
- **Browser** (Foundry VTT) — where DTK runtime modules bundle it
- **Node.js** (dtk-promptuarium's CLI compiler, build tools) — where it runs outside Foundry

This constraint rules out any Foundry type imports inside `@dtk/types`.

## Goals / Non-Goals

**Goals:**
- Single source of truth for all five system-author contracts (Ritus, Codex, Forma, Modus, Exemplar)
- TypeScript types inferred directly from Zod schemas — one definition, no drift
- Runtime Zod validators for each contract, callable at `init` hook
- Type guard functions for runtime narrowing
- TypeScript interface declarations for module API surfaces (AleaApi, LexApi, OpusApi, SystemaApi, PromptariumApi)
- Zero Foundry dependency — pure TypeScript + Zod
- Tree-shakeable subpath exports — bundle only what each module uses

**Non-Goals:**
- Shipping any runtime logic beyond validation and type guards
- Foundry document schemas (DataModel, Actor, Item shapes) — those belong in each module
- Default values or contract defaults — those belong in the consuming module
- UI types or Handlebars types
- Any migration utilities

## Decisions

### Decision 1: Zod for validation

**Chosen**: Zod v3

**Alternatives considered**:
- `io-ts` — functional style, heavier syntax, poor DX for game designer-authored data
- `arktype` — excellent performance, but less ecosystem familiarity; migration path unclear
- Hand-written validators — brittle, verbose, always drifts from the type definitions

**Rationale**: Zod is already used in the Promptuarium prototype. `z.infer<typeof schema>`
gives TypeScript types for free from a single schema definition. The DX for authoring
schemas is the best available. Tree-shaking is reliable with ESM builds.

### Decision 2: Types inferred from Zod schemas — not separately declared

```
                   SINGLE DEFINITION
                   ┌──────────────────────────────┐
                   │  src/ritus/schema.ts          │
                   │                              │
                   │  export const RitusSchema =  │
                   │    z.object({ ... })          │
                   └──────────────┬───────────────┘
                                  │  z.infer<>
                    ┌─────────────┴──────────────┐
                    ▼                            ▼
          TypeScript type                  Zod validator
          export type Ritus =              (runtime check)
            z.infer<typeof RitusSchema>
```

No separately-declared interfaces for contract types. If the schema changes, the type
changes automatically. This is the only way to guarantee they stay in sync.

**Change from prototype**: Systema prototype declares `SystemaDescriptor` and `AleaRitus`
as standalone TypeScript interfaces, then writes separate validation logic. The new
approach collapses these into a single Zod schema definition per contract.

### Decision 3: Module API surfaces as TypeScript interfaces (not Zod schemas)

Module APIs (`AleaApi`, `LexApi`, etc.) are NOT validated with Zod. They describe live
JavaScript objects that Foundry's module system creates — not data authored by a game
designer. Runtime validation would require importing Foundry's module system, which
violates the no-Foundry-dependency rule. TypeScript interface declarations are sufficient;
consuming code checks for existence before calling.

### Decision 4: Subpath exports for tree-shaking

```
package.json "exports":
  "@dtk/types"           →  src/index.ts  (re-exports all)
  "@dtk/types/ritus"     →  src/ritus/index.ts
  "@dtk/types/codex"     →  src/codex/index.ts
  "@dtk/types/forma"     →  src/forma/index.ts
  "@dtk/types/modus"     →  src/modus/index.ts
  "@dtk/types/exemplar"  →  src/exemplar/index.ts
  "@dtk/types/apis"      →  src/apis/index.ts
```

dtk-alea imports only `@dtk/types/ritus` — ships zero Forma or Exemplar Zod code.
dtk-promptuarium imports only `@dtk/types/exemplar` — ships zero Ritus or Forma code.

### Decision 5: Private scoped registry

The package is published to a private npm registry (GitHub Packages under the
`@dtk` scope). Consuming modules configure `.npmrc`:
```
@dtk:registry=https://npm.pkg.github.com
```

This enables premium module gating at the registry level in future — premium modules
can declare `@dtk/types` as a peer dependency and access is controlled by registry auth.

## Package Structure

```
packages/types/                  (lives inside dtk repo)
├── package.json
│     name: "@dtk/types"
│     type: "module"
│     exports: { subpaths per Decision 4 }
├── tsconfig.json
├── src/
│   ├── index.ts                 re-exports all subpaths
│   ├── ritus/
│   │   ├── schema.ts            z.object({...}) — THE definition
│   │   ├── guards.ts            isRitus(), assertRitus()
│   │   └── index.ts             exports schema, Ritus type, guards
│   ├── codex/
│   │   ├── schema.ts
│   │   ├── guards.ts
│   │   └── index.ts
│   ├── forma/
│   │   ├── schema.ts            (largest — step/field union types)
│   │   ├── guards.ts
│   │   └── index.ts
│   ├── modus/
│   │   ├── schema.ts
│   │   ├── guards.ts
│   │   └── index.ts
│   ├── exemplar/
│   │   ├── grant.ts             Grant model (modifier/reference/choice)
│   │   ├── kinds.ts             kind-discriminated schemas
│   │   ├── schema.ts            base envelope + discriminated union
│   │   ├── guards.ts
│   │   └── index.ts
│   └── apis/
│       ├── alea-api.ts          interface AleaApi { ... }
│       ├── lex-api.ts           interface LexApi { ... }
│       ├── opus-api.ts          interface OpusApi { ... }
│       ├── systema-api.ts       interface SystemaApi { ... }
│       ├── promptuarium-api.ts  interface PromptariumApi { ... }
│       ├── guards.ts            isDtkInstalled(), getDtkApi()
│       └── index.ts
└── dist/                        built output (not committed)
```

## Risks / Trade-offs

**[Risk] Zod version skew** → If a consuming module pins Zod at a different minor
version, `z.infer` types may diverge. Mitigation: declare `zod` as a `peerDependency`
with a loose range (`">=3.22 <4"`) and document the version contract in README.

**[Risk] Contract shape changes break all modules** → Because every module imports from
`@dtk/types`, a breaking schema change forces coordinated updates across all repos.
Mitigation: treat major contract changes as semver major bumps; use optional fields
and `z.optional()` / `.passthrough()` for additive changes to stay backward-compatible.

**[Risk] Forma schema complexity** → Forma contains recursive types (condition predicates
can nest, choice grants can nest). Zod handles recursive types via `z.lazy()` but
TypeScript inference on recursive Zod schemas is slow to compile.
Mitigation: use `z.lazy()` only at the recursion point; flatten as much as possible.
Flag compile-time performance in Vitest benchmarks if it degrades.

**[Trade-off] Zod in bundle** → Modules that call `validateRitus()` will include Zod
in their browser bundle (~13 KB gzipped). This is acceptable — validation runs once
at `init`, not in the hot path. Modules that only import TypeScript types pay zero
runtime cost.

## Architectural Decisions (cross-cutting — affect spec revisions)

These decisions emerged during design exploration. They change the shape of
the `ritus` and `exemplar` specs already written and must be resolved before
implementation begins.

### Decision 6: Ritus is engine config only — procedures live in Rule Exemplars

**Chosen**: `kind: rule` Exemplar in Promptuarium carries all action procedures.
The Ritus is lean engine configuration only.

**Rejected alternative**: Embedding pool formulas, consequence blocks, and chains
directly in the Ritus schema (as `poolBuilder`, `onComplete`, etc.).

**Rationale**: The core design philosophy is "compendium-sourced rules." A ranged
attack procedure IS a rule. If it lives in the Ritus (code-registered), it is not
compendium-sourced — it's code-adjacent. Moving procedures to a `kind: rule`
Exemplar means they are authored in YAML, live in the compendium, are overrideable
by content packs, and are distributable independently. This is the only answer
consistent with the system's own stated philosophy.

```
RITUS (engine config, registered once)        RULE EXEMPLAR (compendium content)
───────────────────────────────────           ──────────────────────────────────
id: sr5e                                      kind: rule
mechanic: pool-count                          id: sr5e-ranged-attack
threshold: 5                                  ritus: sr5e
tiers:                                        pool: "@agility + @skills.rangedWeapons"
  critical: 4+                                opposed: "@reaction + @intuition"
  hit:      1+                                on_tier:
  glancing: 0                                   hit: { damage: "...", chain: soak }
  miss: ~                                       glancing: { damage: "...", chain: soak }
                                              chains:
Answers: how does dice resolution work?         soak: { pool: "@body + max(...)" }
Changes: almost never.
                                              Answers: how does THIS action work?
                                              Changes: via house rules, content packs.
```

**Change from prototype**: The alea-core prototype uses `schema.poolBuilder` (a
TypeScript function) and `schema.onComplete` (a TypeScript function). Both are
replaced by declarative Rule Exemplar fields. Zero TypeScript for common mechanics.

**Spec revisions required**:
- `specs/ritus/spec.md` — strip pool/consequence/chain requirements; keep engine config only
- `specs/exemplar/spec.md` — add `kind: rule` with pool formula, on_tier, chains, ritus ref
- `specs/exemplar/spec.md` — add `rule-modifier` to the Grant model (grants that modify an existing Rule)

### Decision 7: Ritus expression strings — Alea-native parser with optional Lex delegation

**Chosen**: Rule Exemplar formula strings (`pool`, `on_tier` damage formulas, `chains`
pool formulas) use a simple expression syntax evaluated by Alea's own built-in parser.
When dtk-lex is installed, complex expressions (conditionals, Codex queries) are
delegated to Lex.

**Rationale**: Alea and Lex are sold separately. Alea must be fully functional without
Lex — including declarative pool formulas and consequence blocks. If Alea required Lex
for formula evaluation it could not be sold independently.

```
FORMULA EVALUATION CHAIN (runtime)

  "@agility + @skills.pistols"
        │
        ▼
  Alea's simple parser          ← handles: @ref, arithmetic (+/-/*), max(), floor()
        │ success?
        ├── yes → evaluate
        └── no (conditional / complex)
                 │
                 ▼
           Lex installed?
                 ├── yes → LexApi.evaluate(formula, ctx)
                 └── no  → throw with message: "This formula requires dtk-lex"
```

**Spec revision required**:
- `specs/ritus/spec.md` — no change (Ritus carries no formulas under Decision 6)
- `specs/exemplar/spec.md` (kind: rule) — document expression string syntax and
  Lex delegation behaviour

### Decision 8: Natural language generation is Promptuarium's build-time responsibility

**Chosen**: Promptuarium generates NL descriptions for Rule Exemplars at compile time.
The `description` field on the base Exemplar envelope carries the result.

**Rationale**: The Exemplar already has a `description` field. The Codex provides
slug → display-name mappings (e.g., `@agility` → "Agility"). Promptuarium's compiler
already walks the Exemplar tree for validation — it can walk it a second time to
render a template-based NL description. Two tiers:

1. **Template renderer** (always runs, offline, deterministic) — produces mechanical
   text from DSL structure using Codex display names
2. **LLM polish** (optional, author-time, result cached in `description`) — takes
   template output and produces natural prose; stored back in the compendium entry

The `description` field in the compiled compendium entry IS the natural language
description. No separate system needed.

**Spec revision required**:
- `specs/exemplar/spec.md` — note that for `kind: rule`, `description` is
  auto-generated by Promptuarium if absent; present value is treated as author override

### Decision 9: `kind: sequence` is a recursive Rule — no separate pipeline/workflow kind

**Chosen**: A single `kind: sequence` Exemplar kind handles multi-step orchestration
at all scales. A sequence is a Rule whose body is an ordered list of step references
rather than a pool formula. Sequences can reference both Rules and other Sequences,
making the composition recursive.

```
kind: rule       ← atomic procedure (one roll or chain)
kind: sequence   ← ordered references to rules and/or sequences

  kind: sequence (referencing rules)   ← a combat exchange
    steps: [attack, full-defense-choice, resolve, soak, apply]

  kind: sequence (referencing sequences) ← a full combat round
    steps: [initiative-phase, action-phase, end-of-round-effects]
```

No separate `kind: pipeline` or `kind: workflow`. Recursion is the mechanism.
One kind discriminator handles atomic through orchestrated scales.

Each step in a sequence carries:
- `id` — step identifier, used as a key in world state and formula references
- `rule` or `sequence` — the Exemplar to execute at this step
- `actor` — role identifier (`initiator`, `target`, or a named participant)
- `condition` — optional expression; step is skipped if falsy
- `await` — optional; `player-decision` suspends execution pending socket reply
- `inputs` — optional map of expression strings feeding prior step results
  into the referenced rule's context

**Spec revision required**:
- `specs/exemplar/spec.md` — add `kind: sequence` alongside `kind: rule`

### Decision 10: Enhance Foundry's combat system — do not replace it

**Chosen**: DTK-Alea hooks INTO Foundry's combat infrastructure. Foundry owns
the Combat document, CombatTracker UI, turn order, initiative, and the
`combatTurn` / `combatRound` hooks. DTK-Alea listens to those hooks and
executes sequences in response. It never unregisters or overrides Foundry's
combat classes.

**Rationale**: Other modules (EnhancedCombatHUD, combat utility belts, etc.)
integrate with Foundry's combat model. Replacing the combat system would break
those integrations. Enhancement via hooks preserves the ecosystem.

```
Foundry owns:                    DTK-Alea hooks into:
─────────────────────────        ──────────────────────────────────
CombatTracker UI                 Hooks.on('combatTurn', ...)
Turn order / initiative            → reads actor's pending sequence
combatTurn hook ─────────────────→ executes steps, writes flags
combatRound hook                   → emits dtk-alea.* hooks
                                     for downstream observers

Other modules fire on the         dtk-alea.stepComplete
same Foundry hooks unaffected.    dtk-alea.awaitDecision
                                  dtk-alea.sequenceComplete
```

DTK-Alea emits its own hook family (`dtk-alea.*`) at each sequence step so
other modules can observe and react without coupling to Alea's internals.

**Spec revision required**:
- Affects dtk-alea module spec (not yet written); note here for traceability.

### Decision 11: Sequence execution state lives in Foundry document flags

**Chosen**: All runtime state produced during sequence execution is stored as
flags on Foundry's `Combat` document (and where appropriate `Actor`/`Combatant`
documents). Nothing about execution state belongs in the compendium.

```
Compendium content          World state (Combat flags)
(static, versioned)         (runtime, synced by Foundry)
──────────────────────      ──────────────────────────────────────
kind: sequence              Combat.flags['dtk-alea'] = {
  steps: [...]                activeSequence: "sr5e-ranged-combat",
                              currentStep: 2,
Defines WHAT can happen.      stepResults: {
                                attack: { tier: "hit", hits: 3, ... }
                              },
                              pendingDecision: {
                                stepId: "full-defense-choice",
                                actorId: "...",
                                choices: ["normal", "full-defense"]
                              },
                              participants: {
                                initiator: actorId,
                                target: actorId
                              }
                            }

                            Records WHAT IS happening.
```

**State survival**: Because execution state is stored in the `Combat` document
(a Foundry world document, persisted to the database and synced to all clients),
a sequence survives player disconnects, GM reconnects, and browser refreshes.
A player who disconnects mid-decision reconnects to find their pending decision
UI re-rendered from the flags.

**Spec revision required**:
- Affects dtk-alea module spec (not yet written); note here for traceability.

### Decision 12: Actions are a thin UI layer over Sequences

**Chosen** (Option C): A lightweight `kind: action` Exemplar serves as the
player-facing entry point. Actions appear in the combat HUD / action menu.
Each action references a sequence. This separates presentation from procedure.

```
kind: action                         kind: sequence
id: fire-pistol                      id: sr5e-ranged-combat
name: "Fire Pistol"                  steps: [attack, defense, ...]
icon: "icons/weapons/gun.svg"
sequence: sr5e-ranged-combat  ───►   The procedure. Rich. Declarative.
cost: { actionPoints: 1 }            Multiple actions can reference
hint: "Standard ranged attack"       the same sequence.

The UI entry point. Thin.
```

Actions are what a player sees and clicks. Sequences are what the engine
executes. Multiple actions can reference the same sequence (e.g., "Fire Pistol"
and "Fire SMG" both reference `sr5e-ranged-combat`; the weapon item provides
the pool modifiers). An action without a sequence is a simple declared effect
with no roll (e.g., "Take Cover" applies an Active Effect directly).

Actions are grantable via the Grant model — a weapon Exemplar grants the
actions available when that weapon is equipped.

**Spec revision required**:
- `specs/exemplar/spec.md` — add `kind: action` alongside `kind: rule`
  and `kind: sequence`

### Decision 13: `@steps.{id}.{field}` as cross-step reference syntax

**Chosen**: Sequence steps reference prior step results using the `@steps.{id}.{field}`
token, consistent with the `@ref` expression syntax used in Rule pool formulas.
Step results are already written to world state (Combat flags, per Decision 11),
making them naturally available as an expression context.

Full expression context available at each sequence step:

```
@steps.{id}.{field}   — result field from a named prior step
@initiator.{field}    — initiator actor's system data
@target.{field}       — current target's system data (per-target execution)
@item.{field}         — active item/weapon fields
@combat.round         — current Foundry combat round
@combat.turn          — current Foundry combat turn number
```

**Skipped step sentinel**: When a step is skipped (its `condition` evaluated to
false), it writes `{ skipped: true, value: null }` to world state. Any downstream
`@steps.{id}.{field}` reference on a skipped step resolves to `null`, which
arithmetic expressions treat as `0`. This prevents crashes and is predictable.

**Spec revision required**:
- `specs/exemplar/spec.md` (kind: sequence) — document step reference syntax
  and sentinel behaviour

### Decision 14: `await: player-decision` — Alea suspends, Systema relays

**Chosen**: When a sequence step declares `await: player-decision`, dtk-alea
emits a Foundry hook and suspends. dtk-systema listens for that hook and owns
the socket relay, UI presentation, and resume call. dtk-alea never touches
sockets or Foundry UI directly.

```
Alea (executor):                     Systema (orchestrator):
────────────────────────             ────────────────────────────────────
reaches await step                   listens: Hooks.on('dtk-alea.awaitDecision')
emits dtk-alea.awaitDecision ──────► writes Combat flags (pendingDecision)
suspends.                            sends socket via gmRelay → target player
                                     shows Decision UI (ApplicationV2)
                                     player responds → socket reply received
                                     calls: alea.resumeSequence(result) ─────►
                                                                          resumes
                                                                          from step
```

The `actor` field on the await step controls who receives the socket message:
- `initiator` → initiator's player (GM if unowned)
- `target` → current target's player (GM if NPC)
- `gm` → always the GM
- `all` → broadcast; first response wins

State written to Combat flags before suspending ensures decision UI re-renders
on reconnect (the pending decision survives disconnect/reconnect).

**Spec revision required**:
- `specs/exemplar/spec.md` (kind: sequence) — document await syntax and actor values
- dtk-alea module spec (future) — document hook emission contract
- dtk-systema module spec (future) — document Decision UI and gmRelay integration

### Decision 15: Action menu lives in dtk-systema, not dtk-alea

**Chosen**: The Action menu (ApplicationV2 that opens on a character's combat
turn) lives in dtk-systema. dtk-systema reads the actor's granted `kind: action`
Exemplars, presents the menu, handles target selection, builds the sequence
execution context, and hands it to dtk-alea. dtk-alea receives a fully-populated
context and executes the sequence — it never opens UI or reads the canvas.

```
dtk-systema owns:              dtk-alea owns:
──────────────────────────     ──────────────────────────────────
Action menu (UI)               executeSequence(context) → results
Target selection (canvas)      executeRule(ruleId, context) → result
Context building               Roll pipeline
Decision relay (gmRelay)       Step result accumulation
Await resume                   Hook emission (dtk-alea.*)
```

Unavailable actions (condition not met) are shown greyed in the Action menu,
not hidden. Players see what exists and why it is unavailable (hover tooltip).

**Rationale**: dtk-alea is a pure dice/sequence executor — callable from Node.js,
testable without Foundry globals, independently useful as a dice library.
Coupling it to canvas and UI would destroy that independence.

**Spec revision required**:
- dtk-systema module spec (future)
- dtk-alea module spec (future)

### Decision 16: `targeting` is a structured object on `kind: action`

**Chosen**: The `targeting` field on `kind: action` is a structured object,
not a string enum. This is required because min/max bounds cannot be expressed
in a flat enum value.

```yaml
targeting:
  mode: token | self | area | none

  # mode: token
  min:       1           minimum selections (default: 1)
  max:       1           maximum allowed (default: 1; null = unlimited)
  filter:    "tag:enemy" optional expression limiting valid targets
  execution: per-target  per-target (default) | once

  # mode: area
  shape:  circle | cone | line | ray
  size:   number         radius or length in grid units
  width:  number         cone and line only
```

`execution: per-target` (default for token mode): sequence runs independently
for each selected target, sequentially. Each target gets their own defense and
soak rolls. Parallel per-target execution is deferred — the world state
complexity of multiple simultaneous `pendingDecision` entries is significant.

`execution: once` (area effects, buffs): sequence runs one time; all targets
injected as `@targets` list. One roll, effects applied to all.

NL generation falls directly from the structure:
- `mode: token, min: 1, max: 1, filter: "tag:enemy"` → "Target one enemy"
- `mode: token, min: 1, max: 3, filter: "tag:enemy"` → "Target 1 to 3 enemies"
- `mode: area, shape: circle, size: 4` → "All creatures within 4 squares"
- `mode: self` → "Self"

**Spec revision required**:
- `specs/exemplar/spec.md` (kind: action) — document TargetingSpec shape

### Decision 17: Targeting execution lives in dtk-systema, not dtk-alea

**Chosen**: The `targeting` field on `kind: action` is declared in `@dtk/types`
(schema) and validated by dtk-promptuarium at build time, but executed at
runtime exclusively by dtk-systema.

```
@dtk/types        TargetingSpec schema — the data shape
                  consumed by Systema (runtime) and
                  Promptuarium (build-time validation)

dtk-promptuarium  validates TargetingSpec at build time
                  checks filter expressions against Codex slugs

dtk-systema       EXECUTES targeting at runtime
                  canvas interaction (token click, template placement)
                  min/max enforcement, filter evaluation
                  builds resolved target list

dtk-alea          CONSUMES the resolved target list only
                  never sees TargetingSpec; never touches canvas
```

Targeting is a canvas/token interaction concern — it involves clicking tokens,
placing MeasuredTemplates, evaluating token relationships. None of this is a
dice concern. Keeping it in dtk-systema preserves dtk-alea as a pure executor.

**Spec revision required**:
- `specs/exemplar/spec.md` (kind: action) — note that targeting execution
  is a dtk-systema runtime concern, not an @dtk/types concern
- dtk-systema module spec (future) — TargetSelector implementation

## Open Questions

- **Versioning cadence**: Should `@dtk/types` version lockstep with the DTK hub module,
  or version independently? Independent versioning is more flexible but requires a
  compatibility matrix. Recommendation: version independently, document compatibility
  in the hub module's `CHANGELOG.md`.

- **Foundry type stubs**: `modus` references `DataModel` subclasses and `ApplicationV2`
  subclasses — types that come from `@league-of-foundry-developers/foundry-vtt-types`.
  Should @dtk/types declare these as `unknown` (keep pure) or accept the fvtt-types
  devDependency? Leaning toward accepting fvtt-types as a devDependency (types-only,
  no runtime cost) — to be decided before Modus spec implementation.

---

## Module Architecture

`@dtk/types` is the **DDD Shared Kernel** for the entire DTK ecosystem. It does not
follow the hexagonal domain/ports/adapters split — it has no runtime behaviour, no
adapters, and no domain services. It is exclusively schemas, inferred types, and
type guards.

```
packages/types/src/
├── ritus/          RitusSchema, Ritus type, isRitus guard
├── codex/          CodexSchema, Codex type, isCodex guard
├── forma/          FormaSchema, ConditionSchema, WizardFieldSchema, ...
├── modus/          ModusSchema, Modus type, isModus guard
├── exemplar/
│   ├── grant.ts    ModifierSchema, ReferenceSchema, ChoiceSchema, RuleModifierSchema
│   ├── kinds/      RuleSchema, SequenceSchema, ActionSchema, class-layer schemas
│   └── schema.ts   ExemplarSchema discriminated union
└── apis/           AleaApi, LexApi, SystemaApi, ... (TypeScript interfaces only)
```

**DDD role:** Every bounded context (dtk-alea, dtk-systema, etc.) imports from
`@dtk/types` as its shared vocabulary. No bounded context re-declares these types.
The contracts ARE the ubiquitous language.

**TDD note:** `@dtk/types` tests are schema-driven, not Red-Green-Refactor cycles.
The Zod schema IS the specification; Vitest tests verify the schema against the
scenarios in each spec.md. Each `#### Scenario:` block maps 1:1 to a named
`it()` in the test file.

**VitestSuite coverage target:** 100% of `src/` (all code is pure schema/type logic
with no Foundry coupling — nothing to exclude).
