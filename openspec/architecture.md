# DTK Architecture Standards

Standing reference for all DTK modules. Every change's design.md and tasks.md
must conform to these patterns. `openspec/config.yaml` encodes them as rules so
the OpenSpec CLI surfaces them automatically.

---

## Hexagonal Architecture (Ports & Adapters)

Every DTK module except `@dtk/types` uses this source layout:

```
src/
├── domain/                   Pure TypeScript — zero Foundry globals
│   ├── entities/             Objects with stable identity
│   ├── value-objects/        Immutable data records
│   └── services/             Domain logic (stateless or aggregate-rooted)
├── ports/                    Interfaces the domain depends on
│   └── IFooPort.ts
└── adapters/
    ├── foundry/              Foundry VTT implementations (excluded from unit tests)
    └── in-memory/            Test doubles (used in Vitest unit tests)
```

**Invariants:**
- `src/domain/` and `src/ports/` have zero imports from `adapters/foundry/` or any
  Foundry global (`game`, `ui`, `Hooks`, `Canvas`, etc.)
- `adapters/foundry/` translates Foundry Document shapes into domain value objects
  (Anti-Corruption Layer) — domain code never reads `actor.system` directly
- `adapters/in-memory/` implement the same port interfaces as `adapters/foundry/`
  and are the stubs used in every unit test

**`@dtk/types` exception:** Types-only package, no hexagonal split. It is the
**Shared Kernel** — schemas, types, and guards. No adapters, no domain services.

---

## Domain-Driven Design Conventions

### Bounded Contexts

Each DTK module is a Bounded Context:

| Module | Bounded Context | Core Aggregate |
|---|---|---|
| `@dtk/types` | Shared Kernel (ubiquitous language) | — |
| `dtk-hub` | Module Coordination | `ModuleRegistry` |
| `dtk-systema` | System Integration | `ActionContext`, `PendingDecision` |
| `dtk-alea` | Dice Execution | `SequenceExecution` |
| `dtk-promptuarium` | Compendium Compilation | `ExemplarCorpus` |
| `dtk-opus` | Character Advancement | `CharacterProgression` |
| `dtk-lex` | Rule Evaluation | `RuleExpression` |

### Ubiquitous Language

The five contracts in `@dtk/types` define the shared ubiquitous language across
all bounded contexts. Use these terms as-is in code, docs, and conversations:

- **Ritus** — dice engine configuration (mechanic, threshold, tiers)
- **Codex** — vocabulary (attributes, skills, damage types, currencies)
- **Forma** — character creation wizard definition (steps, fields, conditions)
- **Modus** — system wiring declaration (actors, items, settings, references)
- **Exemplar** — compendium entry (species, archetype, rule, sequence, action, ...)

### Domain Events

Domain events map to Foundry hooks. Naming convention: `dtk-{module-id}.{event}`.

| Event | Emitter | Meaning |
|---|---|---|
| `dtk-systema.ready` | dtk-systema | All defineSystem() registration complete |
| `dtk-alea.ready` | dtk-alea | Dice engine ready to accept rolls |
| `dtk-alea.await` | dtk-alea | Sequence suspended; player decision required |
| `dtk-alea.complete` | dtk-alea | Sequence execution finished |
| `dtk.ready` | dtk hub | All active DTK modules have signalled ready |

### Entities vs Value Objects

**Entity** — has stable identity; mutations are tracked over time.
```typescript
// Entity: identity = sequenceId
class SequenceExecution {
  readonly sequenceId: string  // identity
  currentStepIndex: number     // mutable state
}
```

**Value Object** — immutable; equality by value, not reference.
```typescript
// Value Object: no identity, replaced not mutated
type RollContext = Readonly<{
  initiator: ActorSnapshot
  targets: ReadonlyArray<ResolvedTarget>
  combat: CombatSnapshot | null
  stepInputs: Readonly<Record<string, unknown>>
}>
```

### Anti-Corruption Layer

Foundry Documents (`Actor`, `Item`, `Combat`) are not domain objects. Adapters
translate them at the boundary:

```typescript
// adapter/foundry/FoundryActorRepository.ts
class FoundryActorRepository implements IActorRepository {
  getSnapshot(actorId: string): ActorSnapshot {
    const doc = game.actors.get(actorId)  // Foundry Document
    return {                               // Domain Value Object
      actorId: doc.id,
      system: structuredClone(doc.system) // frozen copy, not live reference
    }
  }
}
```

---

## Test-Driven Development

### Task Ordering — Red-Green-Refactor

For every feature unit, tasks SHALL appear in this order:

```
[test]  Write failing Vitest test for the domain behaviour
[impl]  Implement domain entity/service to pass the test
[port]  Declare the port interface the domain needs
[stub]  Write in-memory adapter (test double)
[adapt] Write Foundry adapter implementing the port
[wire]  Wire adapter into init/register flow
[smoke] Integration smoke test (manual or e2e)
```

`[test]` always precedes its paired `[impl]`. Never write an `[impl]` task before
the `[test]` task that covers the same behaviour.

### VitestSuite Standards

From the `/vitest-suite` skill — applied to all DTK modules:

**4 test groups per domain method:**

| Group | What it covers |
|---|---|
| `Boundary` | Edge cases: empty inputs, null, zero, max values, limits |
| `Scenario` | Representative happy-path and variant cases |
| `Failure` | Invalid inputs, port errors, domain rule violations |
| `Combinatorial` | Interactions between parameters; order-dependence |

**Coverage targets:**
- `src/domain/` — 85%+ statement coverage
- `src/ports/` — 100% (interfaces; verify via assignability tests)
- `src/adapters/foundry/` — excluded from vitest coverage; smoke-tested only

**File layout:**
```
tests/
├── unit/
│   ├── domain/        mirrors src/domain/
│   └── ports/         interface assignability tests
└── smoke/             manual / Foundry-live tests (not run in CI)
```

**Test file conventions:**
- Each spec scenario (WHEN/THEN) maps 1:1 to a named `it()` or `test()` block
- Shared fixtures and factories go in `tests/unit/helpers/`
- Domain tests inject port stubs via constructor — no module mocking
- Never import from `adapters/foundry/` in unit tests

### Spec Scenarios → Test Cases

Every `#### Scenario:` block in a spec.md is a direct test case target. Name the
test with the scenario title verbatim:

```typescript
// spec: "#### Scenario: Confirm disabled until min tokens selected"
it('Confirm disabled until min tokens selected', () => { ... })
```

This 1:1 mapping ensures spec coverage is verifiable by grep.

---

## Directory Scaffold (all modules)

Every new DTK module repo starts with this scaffold (applied in Group 0 of tasks.md):

```
src/
├── domain/
│   ├── entities/.gitkeep
│   ├── value-objects/.gitkeep
│   └── services/.gitkeep
├── ports/.gitkeep
└── adapters/
    ├── foundry/.gitkeep
    └── in-memory/.gitkeep
tests/
├── unit/
│   ├── domain/.gitkeep
│   ├── ports/.gitkeep
│   └── helpers/.gitkeep
└── smoke/.gitkeep
```

`vitest.config.ts` coverage exclusions:
```typescript
coverage: {
  exclude: ['src/adapters/foundry/**', 'tests/smoke/**', '**/*.d.ts']
}
```
