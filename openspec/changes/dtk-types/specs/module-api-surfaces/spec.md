# Spec: module-api-surfaces

Each DTK module exposes a public API at `game.modules.get('dtk-*').api`.
`@dtk/types` defines TypeScript interfaces for these API surfaces and helper
utilities for safely accessing them. These are interface declarations only —
no Zod validation, no Foundry runtime coupling.

## ADDED Requirements

### Requirement: AleaApi interface

`@dtk/types/apis` SHALL export an `AleaApi` interface describing the public
API surface of dtk-alea. The interface SHALL include:

- `registerRitus(ritus: Ritus): void` — registers a game system's Ritus
- `registerSchema(schema: AleaRollSchema): void` — registers a supplemental roll schema
- `roll(schemaId: string, context: RollContext): Promise<RollResult>` — executes a roll
- `isReady: boolean` — true after the `dtk-alea.ready` Foundry hook fires

`AleaRollSchema` and `RollContext` and `RollResult` SHALL be exported as
supporting interfaces alongside `AleaApi`.

#### Scenario: AleaApi type is importable

- **WHEN** consuming code imports `{ AleaApi } from "@dtk/types/apis"`
- **THEN** TypeScript resolves the import with full method signatures

#### Scenario: AleaApi has no runtime coupling

- **WHEN** `@dtk/types` is bundled for Node.js (no Foundry globals)
- **THEN** the bundle compiles without reference to `game`, `Hooks`, or other Foundry globals

---

### Requirement: LexApi interface

`@dtk/types/apis` SHALL export a `LexApi` interface describing the public
API surface of dtk-lex. The interface SHALL include:

- `registerPlugin(codex: Codex): void` — registers a system's Codex vocabulary
- `evaluate(expression: string, context: LexContext): LexResult` — evaluates a rule expression
- `validate(expression: string, codexId: string): ValidationResult` — validates a formula against a Codex
- `isReady: boolean`

`LexContext`, `LexResult`, and `ValidationResult` SHALL be exported as
supporting interfaces.

#### Scenario: LexApi type is importable

- **WHEN** consuming code imports `{ LexApi } from "@dtk/types/apis"`
- **THEN** TypeScript resolves the import with full method signatures

---

### Requirement: OpusApi interface

`@dtk/types/apis` SHALL export an `OpusApi` interface describing the public
API surface of dtk-opus. The interface SHALL include:

- `register(systemId: string, forma: Forma): void` — registers a system's Forma
- `open(options: OpusOpenOptions): void` — opens the wizard UI
- `isReady: boolean`

`OpusOpenOptions` SHALL be an interface with:
- `mode: "create" | "advance" | "import"`
- `systemId?: string` (required when mode is `"create"` or `"import"`)
- `actor?: unknown` (required when mode is `"advance"` — typed as `unknown` to avoid Foundry coupling)
- `source?: string` (import source key, only relevant when mode is `"import"`)

#### Scenario: OpusApi type is importable

- **WHEN** consuming code imports `{ OpusApi } from "@dtk/types/apis"`
- **THEN** TypeScript resolves the import with full method signatures

#### Scenario: OpusOpenOptions mode is a union

- **WHEN** TypeScript checks `options.mode === "delete"`
- **THEN** TypeScript reports a type error — `"delete"` is not in the union

---

### Requirement: SystemaApi interface

`@dtk/types/apis` SHALL export a `SystemaApi` interface describing the public
API surface of dtk-systema. The interface SHALL include:

- `defineSystem(modus: Modus): void` — the primary entry point
- `version: string` — the installed dtk-systema version string
- `isReady: boolean`

#### Scenario: SystemaApi type is importable

- **WHEN** consuming code imports `{ SystemaApi } from "@dtk/types/apis"`
- **THEN** TypeScript resolves the import

---

### Requirement: PromptariumApi interface

`@dtk/types/apis` SHALL export a `PromptariumApi` interface describing the
public API surface of dtk-promptuarium (both its Foundry runtime face, if any,
and its Node.js CLI face). The interface SHALL include:

- `validate(exemplar: unknown): ValidationResult` — validates a raw object as an Exemplar
- `compile(exemplars: Exemplar[], options: CompileOptions): Promise<void>` — compiles to LevelDB
- `isReady: boolean`

`CompileOptions` SHALL be an interface with `outputDir: string` and optional
`dry: boolean`.

#### Scenario: PromptariumApi type is importable

- **WHEN** consuming code imports `{ PromptariumApi } from "@dtk/types/apis"`
- **THEN** TypeScript resolves the import

---

### Requirement: DTK module presence helpers

`@dtk/types/apis` SHALL export helper functions for safely accessing DTK module
APIs at runtime without direct Foundry coupling in the types layer.

- `getDtkModuleApi<T>(moduleId: string): T | undefined` — returns `game.modules.get(moduleId)?.api as T | undefined`; returns `undefined` if the module is not installed or its API is not yet exposed
- `isDtkModuleInstalled(moduleId: string): boolean` — returns `true` if `game.modules.get(moduleId)?.active` is truthy

These functions SHALL be implemented as thin wrappers that assume `game.modules`
exists. They are browser-only; the types are declared in this package but implementation
is provided by dtk-systema.

#### Scenario: getDtkModuleApi returns api when module installed

- **WHEN** dtk-alea is installed and `getDtkModuleApi<AleaApi>("dtk-alea")` is called
- **THEN** it returns the AleaApi object typed as `AleaApi`

#### Scenario: getDtkModuleApi returns undefined when module absent

- **WHEN** dtk-lex is not installed and `getDtkModuleApi<LexApi>("dtk-lex")` is called
- **THEN** it returns `undefined` without throwing

#### Scenario: isDtkModuleInstalled returns false for unknown module

- **WHEN** `isDtkModuleInstalled("dtk-nonexistent")` is called
- **THEN** it returns `false` without throwing

---

### Requirement: Package subpath export

All API interfaces and helpers SHALL be accessible via the `@dtk/types/apis`
subpath export. They SHALL also be re-exported from the root `@dtk/types` entry.

#### Scenario: Subpath import resolves

- **WHEN** consuming code imports from `"@dtk/types/apis"`
- **THEN** the TypeScript compiler resolves it via the package.json `exports` map

#### Scenario: Root import also resolves API types

- **WHEN** consuming code imports `{ AleaApi, LexApi }` from `"@dtk/types"`
- **THEN** the TypeScript compiler resolves both types
