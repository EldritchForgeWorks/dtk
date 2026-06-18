## 0. Shared Kernel Foundation

> `@dtk/types` is the DDD Shared Kernel — no hexagonal split. All code is pure
> schema/type logic. TDD cycle: write failing test → refine Zod schema until green.
> Each `#### Scenario:` in a spec.md maps 1:1 to a named `it()`. Coverage: 100%.

- [ ] 0.1 [wire] Configure `vitest.config.ts` with coverage provider (no exclusions; 100% target on all `src/`)
- [ ] 0.2 [wire] Create `tests/unit/` directory tree mirroring `src/` subpaths (`ritus/`, `codex/`, `forma/`, `modus/`, `exemplar/`, `apis/`)
- [ ] 0.3 [wire] Create `tests/unit/helpers/` with shared fixture factories (valid Ritus, valid Codex, valid Exemplar stubs)

## 1. Package Scaffold

- [ ] 1.1 [wire] Create `packages/types/` directory with `package.json` (`name: "@dtk/types"`, `type: "module"`, private: true, version: `"0.1.0"`)
- [ ] 1.2 [wire] Add `zod` as a dependency and configure `peerDependencies` with range `">=3.22 <4"`
- [ ] 1.3 [wire] Configure `tsconfig.json` (strict, ESNext, bundler moduleResolution, no Foundry typeRoots)
- [ ] 1.4 [wire] Configure subpath `exports` in `package.json` for `/ritus`, `/codex`, `/forma`, `/modus`, `/exemplar`, `/apis`, and root
- [ ] 1.5 [wire] Add build script (tsc --emitDeclarationOnly for type output; no Vite needed — types-only package)
- [ ] 1.6 [wire] Add Vitest config and `test` script; verify tests run in Node.js (no Foundry globals)

## 2. Ritus Contract

- [ ] 2.1 [test] Write failing Vitest tests for all ritus/spec.md scenarios (identity, mechanic enum, threshold positive-integer constraint, tiers cross-field constraints: critical ≥ hit, glancing < hit)
- [ ] 2.2 [impl] Write `src/ritus/schema.ts` — `RitusSchema` Zod object: `id` (non-empty), `name`, `mechanic` enum, `threshold` (positive integer), `tiers` (`hit` required; `critical`/`glancing` optional; `.superRefine()` for cross-field validation)
- [ ] 2.3 [impl] Export `Ritus = z.infer<typeof RitusSchema>` and `RitusTiers` supporting type
- [ ] 2.4 [impl] Write `src/ritus/guards.ts` — `isRitus(value): value is Ritus` backed by `safeParse`

## 3. Codex Contract

- [ ] 3.1 [test] Write failing Vitest tests for all codex/spec.md scenarios including slug uniqueness collision detection
- [ ] 3.2 [impl] Write `src/codex/schema.ts` — `CodexSchema` with `systemId`, `attributes`, `skills`, `derived`, `damageTypes`, `currencies` (all string arrays); `.superRefine()` for cross-field slug uniqueness
- [ ] 3.3 [impl] Export `Codex = z.infer<typeof CodexSchema>`
- [ ] 3.4 [impl] Write `src/codex/guards.ts` — `isCodex(value): value is Codex`

## 4. Forma Contract

- [ ] 4.1 [test] Write failing Vitest tests for all forma/spec.md scenarios including recursive condition depth and duplicate step id detection
- [ ] 4.2 [impl] Write `src/forma/condition.ts` — `ConditionSchema` recursive discriminated union using `z.lazy()` at `and`/`or`/`not` recursion points
- [ ] 4.3 [impl] Write `src/forma/field.ts` — `WizardFieldSchema` discriminated union for all 7 field types (`text`, `number`, `select`, `allocation`, `priority-matrix`, `derived`, `custom`)
- [ ] 4.4 [impl] Write `src/forma/step.ts` — `WizardStepSchema` with `id`, `label`, optional `hint`/`condition`, `fields` array
- [ ] 4.5 [impl] Write `src/forma/schema.ts` — `FormaSchema` composing above; `.superRefine()` for unique step ids; require `creationSteps` min 1 and `outputMapper` string
- [ ] 4.6 [impl] Export `Forma`, `WizardStep`, `WizardField`, `Condition` inferred types
- [ ] 4.7 [impl] Write `src/forma/guards.ts` — `isForma(value): value is Forma`

## 5. Modus Contract

- [ ] 5.1 [test] Write failing Vitest tests for all modus/spec.md scenarios
- [ ] 5.2 [impl] Write `src/modus/schema.ts` — `ModusSchema`: `id`, `actors` record (min 1 entry, dataModel as `z.unknown()`), optional `items`, optional `ritus`/`codex`/`forma` references, optional `settings`, `schemaVersion`
- [ ] 5.3 [impl] Export `Modus`, `ActorTypeConfig`, `ItemTypeConfig`, `SettingConfig` inferred types
- [ ] 5.4 [impl] Write `src/modus/guards.ts` — `isModus(value): value is Modus`

## 6. Exemplar Contract

- [ ] 6.1 [test] Write failing Vitest tests for all exemplar/spec.md scenarios: base envelope, all 11 kinds, all 4 grant types, class layer parent requirements, recursive choice/sequence, targeting cross-field validation
- [ ] 6.2 [impl] Write `src/exemplar/grant.ts` — `ModifierSchema`, `ReferenceSchema`, `ChoiceSchema` (`z.lazy()` for nested grants), `RuleModifierSchema` (ref + override min 1 entry); export `GrantSchema` union and `Grant` type
- [ ] 6.3 [impl] Write `src/exemplar/kinds/class-layer.ts` — schemas for `species`, `archetype`, `discipline` (requires `parent`), `vocation` (requires `parent`), `item`, `background`, `origin`, `feature`
- [ ] 6.4 [impl] Write `src/exemplar/kinds/rule.ts` — `RuleSchema`: `ritus`, `pool`, `on_tier`; optional `opposed`, `mechanic`, `threshold`, `tiers`, `chains`; export `TierConsequence`, `ChainDef`
- [ ] 6.5 [impl] Write `src/exemplar/kinds/sequence.ts` — `SequenceStepSchema`: `id`, exactly-one-of `rule`/`sequence`, `actor` enum, optional `condition`/`await`/`inputs`; `SequenceSchema` (steps min 1); `z.lazy()` at step `sequence` ref; export `SequenceStep`, `AwaitSpec`, `PlayerDecision`
- [ ] 6.6 [impl] Write `src/exemplar/kinds/action.ts` — `ActionSchema`: `sequence`, `TargetingSpec` (mode discriminated union with cross-field validation: min ≤ max, area requires shape); optional `cost`, `hint`, `icon`, `condition`; export `TargetingSpec`, `ActionCost`
- [ ] 6.7 [impl] Write `src/exemplar/schema.ts` — `ExemplarBaseSchema` + `ExemplarSchema` discriminated union by `kind`; semver on `version`
- [ ] 6.8 [impl] Export `Exemplar`, all kind-specific types, all individual kind schemas from `@dtk/types/exemplar`
- [ ] 6.9 [impl] Write `src/exemplar/guards.ts` — `isExemplar`, `isSpecies`, `isArchetype`, `isDiscipline`, `isVocation`, `isItem`, `isBackground`, `isOrigin`, `isFeature`, `isRule`, `isSequence`, `isAction`

## 7. Module API Surfaces

- [ ] 7.1 [test] Write type-level Vitest tests (`satisfies`) for all API interfaces verifying TypeScript assignability
- [ ] 7.2 [impl] Write `src/apis/alea-api.ts` — `AleaApi`, `RollContext`, `RollResult` interfaces
- [ ] 7.3 [impl] Write `src/apis/lex-api.ts` — `LexApi`, `LexContext`, `LexResult`, `ValidationResult` interfaces
- [ ] 7.4 [impl] Write `src/apis/opus-api.ts` — `OpusApi`, `OpusOpenOptions` interfaces
- [ ] 7.5 [impl] Write `src/apis/systema-api.ts` — `SystemaApi` interface
- [ ] 7.6 [impl] Write `src/apis/promptuarium-api.ts` — `PromptariumApi`, `CompileOptions` interfaces
- [ ] 7.7 [impl] Write `src/apis/guards.ts` — `getDtkModuleApi<T>()` and `isDtkModuleInstalled()` type stubs

## 8. Root Index and Package Validation

- [ ] 8.1 [impl] Write `src/index.ts` re-exporting all subpaths
- [ ] 8.2 [wire] Verify all subpath exports resolve correctly via `tsc --noEmit` in a scratch consumer project
- [ ] 8.3 [wire] Verify the package imports cleanly in Node.js (no `window`/`game`/`Hooks` references leak into the bundle)
- [ ] 8.4 [smoke] Publish dry-run to private registry (`npm publish --dry-run`) and confirm package contents

## 9. Registry and Consumption Setup

- [ ] 9.1 [wire] Configure GitHub Packages registry for the `@dtk` scope; publish `@dtk/types` v0.1.0
- [ ] 9.2 [wire] Add `.npmrc` template (with `@dtk:registry=https://npm.pkg.github.com`) to dtk repo for other module authors to copy
- [ ] 9.3 [smoke] Verify dtk-systema (prototype reference repo) can install `@dtk/types` and TypeScript resolves its imports correctly
