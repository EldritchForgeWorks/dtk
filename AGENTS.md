# DTK — Agent Navigation Guide

Foundry VTT modular toolkit. Hexagonal architecture throughout. This file is the authoritative map for agents navigating the repo.

---

## Repo Layout

```
/
├── module/             dtk (Hub) — central registry, exposes game.dtk
├── packages/
│   ├── types/          @dtk/types — shared kernel, zero runtime
│   ├── alea/           dtk-alea — dice engine + sequence executor
│   ├── lex/            dtk-lex — rules DSL, expression evaluator
│   ├── systema/        dtk-systema — Foundry integration layer
│   ├── opus/           dtk-opus — character creation / advancement wizard
│   ├── fascia/         dtk-fascia — UI foundation (CSS tokens, base app)
│   ├── promptuarium/   dtk-promptuarium — compendium compiler CLI
│   └── shadowrun/      dtk-shadowrun — SR6e reference system implementation
├── openspec/
│   ├── architecture.md
│   ├── config.yaml
│   ├── specs/          one subfolder per capability spec
│   └── changes/        active and archived OpenSpec changes
└── AGENTS.md           (this file)
```

Each package is independently built. There is no workspace root build script.

---

## Build

Each package builds with Vite. Run from the package directory:

```bash
# From any package directory:
node node_modules/.bin/vite build

# Type-check only:
node node_modules/.bin/tsc --noEmit

# shadowrun packs only (LevelDB compendium):
node scripts/build-packs.mjs
```

**Important**: Foundry server caches LevelDB pack data at startup. After rebuilding packs, a full server restart is required — browser F5 does not clear the server-side cache.

---

## Releases

Each module releases independently from this repo via a per-module tag: `<module-id>-v<semver>` (e.g. `dtk-alea-v0.2.0`). Pushing the tag triggers `.github/workflows/release.yml`, which builds that module, packages it with `scripts/package-module.mjs`, and publishes two releases:

- `<module-id>-v<semver>` (immutable) — assets `<module-id>.zip` + `module.json`
- `<module-id>-latest` (moving, recreated every release) — same assets; backs the stable manifest URL `https://github.com/EldritchForgeWorks/dtk/releases/download/<module-id>-latest/module.json`

**module.json release fields**: `url` is static. `manifest` and `download` are **stamped by CI at release time** (`scripts/package-module.mjs`) — the values checked into each `module.json` are defaults only; do not hand-maintain them. The tag version must match the module's `module.json` `version` or the workflow fails.

The hub registry (`registry.json`, repo root) is updated on `main` by the workflow after each release (`scripts/update-registry.mjs`); only `latestVersion`/`manifestUrl` are machine-updated.

### Publishing npm packages (`@dtk/types`, `@dtk/promptuarium`)

Both packages publish manually to the **public npm registry** (`registry.npmjs.org`) — no CI pipeline for v1, no auth token required by consumers.

Procedure (order matters — types first):

```bash
# 1. @dtk/types
cd packages/types
npm run build && npm test
npm pack --dry-run          # verify: dist/** + package.json only
npm publish --access public

# 2. @dtk/promptuarium
cd ../promptuarium
npm run build && npm test   # build emits dist/dtk-promptuarium.js + dist/cli/index.js
npm pack --dry-run          # verify: dist/** + package.json only
npm publish --access public
```

Rules:

- **Version bumps**: bump `version` in the package's own `package.json` (semver). The two packages version independently; bump `@dtk/types` first if a contract changed, then `@dtk/promptuarium` in the same session if it consumed the change.
- `--access public` is required for scoped packages (also set via `publishConfig.access` in both manifests).
- `@dtk/promptuarium` **bundles** `@dtk/types` (and zod/commander) into `dist/cli/index.js` via `vite.config.cli.ts` — it has no runtime dependency on `@dtk/types`. Only `classic-level` and `js-yaml` are install-time dependencies.
- `packages/types/.npmrc` pins the `@dtk` scope to `registry.npmjs.org`; never re-pin it to GitHub Packages (public reads there require a token, which generated GM repos must not need).
- `@dtk/promptuarium` is CLI-only: no `.` export (no `.d.ts` is emitted). Programmatic import is intentionally unsupported; consumers use the `promptuarium` bin.

---

## Architectural Rules

- `src/domain/` — pure TypeScript, zero Foundry globals. All logic lives here.
- `src/adapters/foundry/` — uses Foundry globals (`game`, `Hooks`, `Roll`, etc.), excluded from unit tests.
- `src/adapters/in-memory/` — test doubles implementing every port.
- `src/ports/` — interfaces (ports) that domain services depend on.
- Foundry globals in adapter files are declared `declare const X: any` at the top. Domain files have zero such declarations.
- Every port has both a Foundry adapter and an in-memory test double.

---

## Module Startup Sequence

1. Hub `init` → creates `game.dtk`
2. All other modules `init` → call `game.dtk.register({ id, version, api })`
3. Hub `ready` → fires `dtk.ready`
4. `dtk-alea` `ready` → `CompendiumScanner.scanAll()` registers all pack items

**Accessing another module's API from code**:
```ts
const alea = (game as any).dtk?.getApi?.('dtk-alea') as AleaApi | undefined;
if (!alea?.isReady?.()) return;
```

---

## Package Reference

### `dtk` — Hub (`module/`)

Central coordination point. Every other DTK module self-registers here.

**Key files**:
- `src/index.ts` — entry, creates `game.dtk`
- `src/domain/services/ModuleCoordinator.ts` — registration aggregate
- `src/domain/entities/DtkModuleEntry.ts` — `{ id, version, api, ready }`

**`game.dtk` API**:
```ts
game.dtk.register({ id, version, api })     // called by each module on init
game.dtk.getApi<T>(moduleId): T             // retrieve another module's API
game.dtk.isInstalled(moduleId): boolean
game.dtk.pendingModules(): string[]
```

**Hooks emitted**: `dtk.ready`

---

### `@dtk/types` — Shared Kernel (`packages/types/`)

Zero runtime. Pure TypeScript types, Zod schemas, guards. Imported by all other packages via `devDependencies: { "@dtk/types": "file:../../packages/types" }`.

**Five domain contracts** (all re-exported from `src/index.ts`):

| Contract | Purpose |
|----------|---------|
| `Ritus` | Dice engine config: `mechanic`, `sides`, `threshold`, `tiers` |
| `Codex` | Vocabulary registry for an RPG system |
| `Forma` | Character wizard: `creationSteps`, `advancementTracks` |
| `Modus` | System wiring: actors, items, ritus, codex, forma, settings |
| `Exemplar` | Discriminated union of compendium item types |

**Module API interfaces** (all defined here):
`AleaApi`, `LexApi`, `OpusApi`, `SystemaApi`, `DtkHubApi`, `PromptariumApi`

**Sequence types**: `MechanicSequenceExemplar`, `MechanicSequenceStep`

---

### `dtk-alea` — Dice Engine (`packages/alea/`)

Cross-system dice resolution. Executes multi-step sequences, resolves pool rolls, classifies tiers, handles interactive await/resume flow.

**Foundry item types**: `dtk.ritus`, `dtk.sequence`

**API** (`game.dtk.getApi('dtk-alea')` → `AleaApi`):
```ts
registerRitus(ritus: Ritus): void
execute(context: RollContext): Promise<void>
executeByRef(uuid, actorId, targetIds): Promise<void>         // by compendium UUID
executeBySystemId(systemId, actorId, targetIds): Promise<void> // by sequence.system.id string
resume(sequenceId, choice): Promise<void>                      // unblocks suspended await step
isReady(): boolean
```

**Domain entities** (`src/domain/entities/`):
- `SequenceExecution` — aggregate root. Fields: `sequenceId`, `exemplarId`, `stepIndex`, `context`, `status ('queued'|'running'|'suspended'|'complete')`. Methods: `advance()`, `suspend(ts)`, `resume()`, `complete()`, `recordStepOutput(id, result)`, `recordChoice(id, choice)`, `toSnapshot()`, `SequenceExecution.fromSnapshot(snap)`.
- `RollContext` — value object: `{ systemId, sequenceExemplarId, sequenceExemplar, initiator: ActorSnapshot, targets: ActorSnapshot[], item, combat }`.

**Domain services** (`src/domain/services/`):
- `SequenceExecutor` — main loop. Iterates steps; handles `rule` (roll + tier) and `await` (suspend + save). Peek-ahead: after a rule step, checks if the next step is a conditional `await`; if condition passes, embeds `awaitMeta` in the step event so the card can render a button; if condition fails, reads `on_skip.message` from the await step and injects it as the rule card's `message`.
- `ExpressionParser` — resolves `@`-references and arithmetic natively. Falls back to `IExpressionDelegate` (lex) for complex expressions.
- `RitusRegistry` — indexed by id and UUID.
- `SequenceExemplarRegistry` — indexed by UUID and `system.id`.
- `RollResolver` — calls `IDiceRoller`, passes to `TierResolver`.
- `TierResolver` — maps hit count to tier string from the step's `tiers` map.

**Ports** (`src/ports/`):
- `IActorRepository` — `getSnapshot(actorId): ActorSnapshot | null`
- `ICombatStateStore` — `save / load / delete / loadByActorId / clearQueued`
- `IDiceRoller` — `roll(pool, sides): Promise<number[]>`
- `IHookEmitter` — `emit(event, payload): void`
- `IExpressionDelegate` — `evaluate(expr, ctx): unknown`

**Foundry adapters** (`src/adapters/foundry/`):
- `FoundryCombatStateStore` — in-memory `Map` as primary store (works without active combat), Foundry combat flags as persistence backup.
- `FoundryActorRepository` — reads `game.actors`.
- `FoundryDiceRoller` — wraps Foundry `Roll`.
- `FoundryHookEmitter` — calls `Hooks.callAll()`.
- `LexExpressionDelegate` — calls `game.dtk.getApi('dtk-lex').evaluate()`.
- `CompendiumScanner` — on `ready`, scans all packs for `dtk.ritus` and `dtk.sequence` items.

**Hooks emitted**:
- `dtk-alea.step` — after every rule step resolves. Payload:
  ```ts
  {
    sequenceId, stepId,
    initiatorName, targetName,
    ar, dr,                   // Attack Rating (initiator), Defense Rating (target)
    defensePool, soakPool,    // computed from target attributes
    tier, mechanic, hits, netHits, faces, pool, rolls,
    damage?,                  // from on_tier consequence
    effect?,                  // from on_tier consequence
    message?,                 // from on_tier consequence or on_skip injection
    hasAwait?, awaitLabel?, awaitSequenceId?, awaitChoice?  // peek-ahead data
  }
  ```
- `dtk-alea.await` — sequence suspended at an await step. Payload: `{ sequenceId, stepId, choices, actorId }`.
- `dtk-alea.complete` — sequence finished. Payload: `{ sequenceId, exemplarId, stepOutputs }`.

**Hooks consumed**: `combatTurn` (auto-execute queued sequences), `combatRound` (clear queued)

---

### Sequence JSON Format

Stored as `dtk.sequence` compendium items under `system.steps`:

```json
{
  "type": "rule",
  "id": "attack",
  "pool": "@initiator.system.skills.firearms + @initiator.system.agility",
  "tiers": { "miss": 0, "hit": 1, "strong": 4, "exceptional": 6 },
  "condition": { "field": "@steps.attack.tier", "op": "neq", "value": "miss" },
  "on_tier": {
    "miss": { "damage": "8", "message": "Grazes.", "effect": "Shaken" }
  }
}

{
  "type": "await",
  "id": "await-defense",
  "choices": ["roll-defense"],
  "condition": { "field": "@steps.attack.tier", "op": "neq", "value": "miss" },
  "on_skip": { "message": "Shot deflected." }
}
```

**Condition operators**: `eq`, `neq`, `gt`, `lt`, `gte`, `lte`  
**Condition value**: can be a literal or an `@`-expression (e.g. `"@steps.defense.hits"`)  
**`on_skip`**: non-standard field on await steps; when the await is skipped (condition false), `on_skip.message` is injected as the preceding rule card's `message` field.

**Expression scopes**: `@initiator.X`, `@target.X`, `@item.X`, `@combat.X`, `@steps.stepId.hits`, `@steps.stepId.tier`, `@steps.stepId.netHits`. Arithmetic (`+`, `-`, `*`, `/`) is evaluated natively.

---

### `dtk-lex` — Rules DSL (`packages/lex/`)

Parses and evaluates complex RPG expressions. Optional dependency for alea and opus.

**Foundry item type**: `dtk.codex-entry`

**API** (`game.dtk.getApi('dtk-lex')` → `LexApi`):
```ts
isReady: boolean
registerCodex(systemId, entries: CodexEntry[]): void
exportCodexJson(systemId): Record<string, string>
evaluate(expr: string, context: ExpressionContext): Value | null
registerFunction(name, fn: FunctionImpl): void
resolveCondition(systemId, condId, ctx): boolean
openEditor(options): Promise<string | null>
```

**Domain**: `ExpressionEngine` (Lexer → Parser AST → Interpreter), `CodexRegistry`, `ConditionEvaluator`  
**Hooks emitted**: `dtk-lex.ready`

---

### `dtk-systema` — Integration Layer (`packages/systema/`)

Glue between game systems and DTK engines. `defineSystem(modus)` is the main entry point for system authors.

**API** (`game.dtk.getApi('dtk-systema')` → `SystemaApi`):
```ts
isReady: boolean
version: string
defineSystem(modus: Modus): void   // call from Hooks.on('init')
```

**Domain services**: `SystemRegistrar`, `ConditionEvaluator`, `TargetingResolver` (self/single/multi/template), `ContextBuilder` (builds `RollContext`), `AwaitCoordinator` (shows decision dialogs, routes via socket), `ActionLoader`

**Hooks consumed**: `dtk-alea.await`, `controlToken`, `updateActor`  
**Socket messages**: `dtk-systema.decision-request`, `dtk-systema.decision-relay`, `dtk-systema.decision-response`  
**Hooks emitted**: `dtk-systema.ready`

---

### `dtk-opus` — Creation Wizard (`packages/opus/`)

Character creation and advancement tracker, driven by `Forma` schemas.

**API** (`game.dtk.getApi('dtk-opus')` → `OpusApi`):
```ts
isReady: boolean
registerForma(systemId, forma: Forma): void
openCreationWizard(actor, systemId): Promise<CharacterBuild | null>
openAdvancementTracker(actor): void
getBuild(actor): CharacterBuild | null
triggerMilestone(actorOrAll): void   // GM only
onSessionEnd(): void
```

**Domain**: `FormaRegistry`, `CreationEngine`, `AdvancementEngine` (XP/milestone/practice), `PrerequisiteEvaluator`  
**Hooks emitted**: `dtk-opus.ready`

---

### `dtk-fascia` — UI Foundation (`packages/fascia/`)

CSS design tokens, reset, base application class. Required by `dtk-shadowrun`.

**Exports**:
```ts
FasciaApp               // base ApplicationV2 with .dtk-app class
withFascia<T>()         // mixin for any ApplicationV2 subclass
registerPartials()      // registers Handlebars partials from templates/
```

No `game.dtk` registration (UI-only module). No item types.

---

### `dtk-promptuarium` — Compendium Compiler (`packages/promptuarium/`)

CLI tool. Reads YAML Exemplar sources, validates against `@dtk/types`, optionally generates NL descriptions, writes to Foundry LevelDB packs.

**CLI** (`src/cli/index.ts`):
```bash
promptuarium compile    # YAML → LevelDB
promptuarium validate   # validate YAML against schemas
promptuarium describe   # generate NL descriptions via LLM
```

**Domain**: `ExemplarCorpus`, `ExemplarCompiler`, `CorpusValidator`, `NLGenerator`  
**Node adapters** (not Foundry): `YamlExemplarSource`, `LevelDBCompendiumTarget`, `OpenAILLMClient`, `JsonCodexProvider`  
**Ports**: `IExemplarSource`, `ICompendiumTarget`, `ICodexProvider`, `ILLMClient`

---

### `dtk-shadowrun` — SR6e Reference System (`packages/shadowrun/`)

Reference implementation. Demonstrates the full DTK pipeline: character sheet → sequence execution → interactive chat cards.

**Foundry actor type**: `dtk-shadowrun.shadowrunCharacter`

**`ShadowrunCharacterData` schema** (`src/actors/ShadowrunCharacterData.ts`):

| Field | Type | Notes |
|-------|------|-------|
| `body`, `agility`, `reaction`, `strength`, `willpower`, `logic`, `intuition`, `charisma` | `NumberField(1–12)` | Core attributes |
| `edge`, `edgeCurrent`, `essence`, `magic`, `resonance` | `NumberField` | Special attributes |
| `ar` | `NumberField(0–20)` | Attack Rating (from weapon) |
| `dr` | `NumberField(0–20)` | Defense Rating (from armor) |
| `physicalDamage`, `stunDamage` | `NumberField(0–20)` | Condition monitors |
| `skills.*` | `SchemaField` of `NumberField(0–12)` | Flat map: `firearms`, `athletics`, `closeCombat`, etc. |

**Derived getters**: `physicalMonitor`, `stunMonitor`, `initiative`, `composure`, `judgeIntentions`, `liftCarry`

**`ShadowrunCharacterSheet`** (`src/actors/ShadowrunCharacterSheet.ts`):
- Extends `HandlebarsApplicationMixin(DocumentSheetV2)`
- Template: `templates/character-sheet.hbs`
- Actions: `rollAttr`, `rollSkill`, `runSequence`, `togglePhysBox`, `toggleStunBox`
- Runs sequences: `alea.executeBySystemId(seqId, actorId, targetIds)`
- Uses `foundry.applications.handlebars.renderTemplate()` (not deprecated global)

**Chat card system** (`src/chat/renderDiceCard.ts`):
- Listens to `dtk-alea.step` hook
- Renders `templates/dice-card.hbs` via `foundry.applications.handlebars.renderTemplate()`
- Attack card: two-column layout (attacker left: AR + Attack pool; defender right: DR + Defense pool + Soak pool)
- `renderChatMessage` hook wires `.sr-card__await-btn` buttons → `alea.resume(sequenceId, choice)`
- Target-side steps (`defense`, `soak`, `resistance`, `drain`) swap `rollerName`/`opposingName`

**Compendium packs**:
- `packs/sr-ritus` — `dtk.ritus`: `shadowrun.dice-pool` mechanic
- `packs/sr-sequences` — `dtk.sequence`: `sr.ranged-attack` (5-step interactive combat)

**SR6e Ranged Attack sequence** (`sr.ranged-attack`):
1. `attack` (rule) — `firearms + agility` pool
2. `await-defense` — suspended if attack didn't miss
3. `defense` (rule) — `reaction + intuition` pool; runs if attack didn't miss
4. `await-soak` — suspended if `attack.hits > defense.hits`; `on_skip: { message: "Shot deflected." }`
5. `soak` (rule) — `body` pool; runs if attack beats defense; `on_tier.miss/partial` computes damage

**Template files**: `templates/character-sheet.hbs`, `templates/dice-card.hbs`  
**CSS**: `styles/dice-card.css`, `styles/index.css`

---

## Foundry V13 API Notes

- **`renderTemplate`** is deprecated. Use `foundry.applications.handlebars.renderTemplate(path, data)`.
- Declare globals as `declare const foundry: any` in adapter files. Never in domain files.
- `CONFIG.Item.dataModels['dtk.ritus']`, `CONFIG.Item.dataModels['dtk.sequence']` — item type registration pattern.
- `DocumentSheetV2` + `HandlebarsApplicationMixin` — the standard sheet base class.

---

## OpenSpec Specs

Capability specs live under `openspec/specs/`. Each subfolder has a `spec.md`. Active change proposals live under `openspec/changes/`, archived ones under `openspec/changes/archive/`.

Key specs relevant to active development:
`sequence-executor`, `roll-resolver`, `expression-parser`, `ritus`, `ritus-registry`, `await-relay`, `combat-integration`, `context-builder`, `condition-evaluator`, `sequence-executor`, `exemplar`, `module-api-surfaces`, `foundry-runtime`

---

## Common Patterns

### Adding a new sequence step type
1. Add the type to `MechanicSequenceStep` in `packages/types/src/exemplar/schema.ts`
2. Handle it in `SequenceExecutor.runFrom()` (`packages/alea/src/domain/services/SequenceExecutor.ts`)

### Adding a new attribute to a character
1. Add `NumberField` to `defineSchema()` in `ShadowrunCharacterData.ts`
2. Add to `_prepareContext` return in `ShadowrunCharacterSheet.ts`
3. Add to the template (`character-sheet.hbs`) and any relevant card template (`dice-card.hbs`)
4. Add to executor payload in `SequenceExecutor.ts` if it should appear on chat cards
5. Add to `renderDiceCard.ts` template data

### Adding a new sequence
1. Create a JSON file in `packages/shadowrun/src/packs/sr-sequences/`
2. Run `node scripts/build-packs.mjs` from the shadowrun directory
3. Restart the Foundry server (browser F5 is not enough)

### Testing domain logic
Inject in-memory adapters from `src/adapters/in-memory/` directly into domain services. No module mocking needed.
