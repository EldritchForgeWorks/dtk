# Spec: apis (contract)

The apis contract defines the TypeScript interfaces for every module API exposed via
`game.dtk`. These are interfaces only — no Zod schemas, no runtime validation. Each
module's implementation must satisfy its interface. Exported from `@dtk/types/apis`.

## ADDED Requirements

### Requirement: DtkHubApi interface

```typescript
interface DtkHubApi {
  register(entry: DtkModuleEntry): void
  api<T>(moduleId: string): T | null
  isInstalled(moduleId: string): boolean
  readonly modules: ReadonlyMap<string, DtkModuleEntry>
  readonly isReady: boolean
}

interface DtkModuleEntry {
  id: string
  version: string
  api: unknown
}
```

#### Scenario: DtkHubApi shape — register + api retrieval

- **WHEN** a class implementing `DtkHubApi` is constructed
- **THEN** `register()`, `api<T>()`, `isInstalled()`, `modules`, and `isReady` are accessible

---

### Requirement: AleaApi interface

```typescript
interface AleaApi {
  registerRitus(ritus: Ritus): void
  execute(sequenceId: string, context: ActionContext): Promise<SequenceExecution>
  resume(sequenceId: string, choice: string | null): Promise<SequenceExecution>
  readonly isReady: boolean
}

interface ActionContext {
  systemId: string
  initiatorId: string        // Actor id
  targetIds: string[]        // Actor ids
  itemId?: string
  combatId?: string
  stepOutputs?: Record<string, RollResult | null>
}

interface RollResult {
  hits: number
  opposedHits: number | null
  netHits: number
  tier: string
  faces: number[]
  pool: number
}

interface SequenceExecution {
  sequenceId: string
  stepIndex: number
  stepOutputs: Record<string, RollResult | null>
  context: ActionContext
  suspendedAt?: string
  status: "running" | "suspended" | "complete"
}
```

#### Scenario: AleaApi shape complete

- **WHEN** a class implementing `AleaApi` is constructed
- **THEN** all four members (`registerRitus`, `execute`, `resume`, `isReady`) are present

---

### Requirement: LexApi interface

```typescript
interface LexApi {
  registerCodex(systemId: string, entries: CodexEntry[]): void
  evaluate(expression: string, context: ExpressionContext): Value | null
  registerFunction(name: string, fn: (args: Value[]) => Value): void
  openEditor(options: EditorOptions): Promise<string | null>
  exportCodexJson(systemId: string): Record<string, string>
  resolveCondition(systemId: string, conditionId: string, context: ExpressionContext): boolean
  readonly isReady: boolean
}

type Value = number | boolean | string | null

interface ExpressionContext {
  [scope: string]: unknown
}

interface EditorOptions {
  systemId: string
  initialExpression?: string
  context?: ExpressionContext
  title?: string
}
```

#### Scenario: LexApi shape complete

- **WHEN** a class implementing `LexApi` is constructed
- **THEN** all seven members are present and correctly typed

---

### Requirement: OpusApi interface

```typescript
interface OpusApi {
  registerForma(systemId: string, forma: Forma): void
  openCreationWizard(actor: FoundryActor, systemId: string): Promise<CharacterBuild | null>
  openAdvancementTracker(actor: FoundryActor): void
  getBuild(actor: FoundryActor): CharacterBuild | null
  triggerMilestone(actorOrAll: FoundryActor | "all"): void
  readonly isReady: boolean
}

interface CharacterBuild {
  systemId: string
  steps: Record<string, unknown>
  advancements: PurchasedAdvancement[]
  paradigmState: ParadigmState
}

interface PurchasedAdvancement {
  id: string
  purchasedAt: number   // Unix timestamp ms
}

type ParadigmState =
  | { paradigm: "xp";        currency: string; total: number; spent: number }
  | { paradigm: "milestone"; advancementsRemaining: number }
  | { paradigm: "resource";  currency: string }
  | { paradigm: "practice";  practiceLog: Record<string, number> }
  | { paradigm: "marks";     currency: string; total: number; spent: number }
  | { paradigm: "session";   sessionsCompleted: number; advancementsRemaining: number }

// FoundryActor is the Foundry Document type — typed as `unknown` here to avoid
// a Foundry global dependency in @dtk/types. Implementations narrow it.
type FoundryActor = unknown
```

#### Scenario: ParadigmState discriminated union is exhaustive

- **WHEN** a switch on `paradigmState.paradigm` is written in TypeScript
- **THEN** TypeScript enforces coverage of all six variants

---

### Requirement: PromptariumApi interface

```typescript
interface PromptariumApi {
  validate(value: unknown): PromptariumValidationResult
  readonly isReady: boolean
}

interface PromptariumValidationResult {
  valid: boolean
  errors: PromptariumValidationError[]
}

interface PromptariumValidationError {
  exemplarId?: string
  field: string
  message: string
}
```

#### Scenario: PromptariumApi shape complete

- **WHEN** a class implementing `PromptariumApi` is constructed
- **THEN** `validate()` and `isReady` are present

---

### Requirement: SystemaApi interface

```typescript
interface SystemaApi {
  defineSystem(definition: SystemDefinition): void
  readonly isReady: boolean
}

interface SystemDefinition {
  systemId: string
  attributePaths?: string[]     // dot-notation paths to actor system attributes
  skillPaths?: string[]         // dot-notation paths to actor system skills
  conditionPaths?: string[]     // dot-notation paths to actor system conditions
}
```

#### Scenario: SystemaApi shape complete

- **WHEN** a class implementing `SystemaApi` is constructed
- **THEN** `defineSystem()` and `isReady` are present

---

### Requirement: All interfaces re-exported from @dtk/types/apis

`@dtk/types/apis` SHALL export all of the above interfaces and supporting types.
This module contains **no runtime code** — only TypeScript type declarations.
It SHALL have zero imports from Zod or any runtime library.

#### Scenario: Import resolves to type-only exports

- **WHEN** `import type { AleaApi, LexApi, OpusApi } from "@dtk/types/apis"` is used
- **THEN** no runtime bundle is emitted for this import (types erased at compile time)

#### Scenario: Module has zero runtime dependencies

- **WHEN** the compiled `@dtk/types/apis` package is inspected
- **THEN** no `require()` or `import` calls remain in the emitted JavaScript
