# Tasks: dtk-promptuarium

## Group 0: Architecture Scaffold

- [x] [wire] Create package structure: `packages/promptuarium/src/` (CLI + domain) and `module/src/` (Foundry runtime face)
- [x] [wire] Create hexagonal directory structure under `packages/promptuarium/src/`: `domain/`, `ports/`, `adapters/node/`, `adapters/in-memory/`
- [x] [wire] Configure vitest with `coverage.exclude: ["packages/promptuarium/src/adapters/node/**", "module/src/**"]` and `coverage.thresholds: { lines: 85 }`
- [x] [wire] Create `tests/` directory with `fixtures/` and `helpers/` subdirectories under `packages/promptuarium/`
- [x] [wire] Declare all four port interfaces in `packages/promptuarium/src/ports/`: `IExemplarSource`, `ICompendiumTarget`, `ICodexProvider`, `ILLMClient`
- [x] [wire] Write all four in-memory stubs in `adapters/in-memory/`: `InMemoryExemplarSource`, `InMemoryCompendiumTarget`, `StubCodexProvider`, `StubLLMClient`
- [x] [wire] Create test fixture factory `tests/fixtures/exemplar.ts` with `makeRuleExemplar()`, `makeSequenceExemplar()`, `makeActionExemplar()`, `makeSpeciesExemplar()`, `makeDisciplineExemplar()`

---

## Group 1: CorpusValidator [corpus-validator]

- [x] [test] Write `CorpusValidator` unit tests covering: valid Exemplar produces no errors, invalid Exemplar records field-level errors, all Exemplars validated before errors reported, discipline with valid archetype parent passes, discipline with missing parent fails with message, discipline with wrong-kind parent fails, action with valid sequence ref passes, action with missing sequence ref fails, unique ids pass, duplicate id produces errors for all duplicates, `ValidationResult` is JSON-serialisable (4 groups: Boundary/Scenario/Failure/Combinatorial)
- [x] [impl] Implement `ExemplarCorpus` aggregate root: `Map<string, Exemplar>` backing store; `add(exemplar)` and `entries()` methods; cross-reference graph computed lazily
- [x] [impl] Implement `CorpusValidator` domain service: pass 1 — `ExemplarSchema.safeParse()` per entry, collect `ValidationError[]`; pass 2 — cross-reference checks (parent ids, ref ids, sequence ids, kind constraints); pass 3 — slug uniqueness; returns `ValidationResult`

---

## Group 2: ExemplarCompiler [exemplar-compiler]

- [x] [test] Write `ExemplarCompiler` unit tests covering: compile halts on validation errors (no LevelDB write), compile writes after clean validation, compiled entry has correct type from kind, compiled entry carries promptuarium flag, one LevelDB database per Modus compendium declaration, entries in correct pack by kind, second compile produces identical output (4 groups)
- [x] [impl] Implement `CompiledEntry` value object: `_id`, `name`, `type`, `system`, `flags['dtk-promptuarium']`; deterministic `_id` from Exemplar id slug using stable hash
- [x] [impl] Implement `ExemplarCompiler` domain service: two-phase (validate then write); reads `outputMapper` from Modus; maps Exemplar fields to `system.*` via JSON-path key map; delegates write to `ICompendiumTarget`
- [x] [stub] Implement `InMemoryCompendiumTarget` stub (already in Group 0 — extend to record written entries for assertion)

---

## Group 3: NLGenerator [nl-generator]

- [x] [test] Write `NLGenerator` unit tests covering: missing description generated, existing description not overwritten, existing description overwritten with --force, known Codex slug resolves to display name, unknown slug falls back to slug, LLM polish called on first run, cached result reused on unchanged Exemplar, cache invalidated on content change, source YAML updated, other YAML fields unchanged after write-back (4 groups)
- [x] [impl] Implement `NLGenerator` domain service: Handlebars template registry (one template per kind); `{{resolve slug}}` Handlebars helper via `ICodexProvider`; LLM polish path via `ILLMClient` with content-hash cache in `.promptuarium-cache.json`; write-back preserves YAML structure
- [x] [stub] Implement `StubLLMClient` stub (already in Group 0 — extend with call-count tracking for cache tests)

---

## Group 4: Node.js Adapters [adapt]

- [x] [adapt] Implement `YamlExemplarSource`: reads all `*.yaml` files from `exemplarsDir`; parses via `js-yaml`; returns raw objects for corpus loading; `IExemplarSource` port
- [x] [adapt] Implement `LevelDBCompendiumTarget`: wraps `ClassicLevel`; writes entries as `key=!{type}!{id}`, `value=JSON(CompiledEntry)`; creates one database per pack declaration; `ICompendiumTarget` port
- [x] [adapt] Implement `JsonCodexProvider`: reads compiled Codex JSON from `codexFile`; `resolveSlug(slug): string` lookup; returns slug itself if not found; `ICodexProvider` port
- [x] [adapt] Implement `OpenAILLMClient`: calls OpenAI chat completions API with `polish` prompt; `ILLMClient` port (gated behind `--llm` flag — never called unless explicitly requested)

---

## Group 5: CLI [cli]

- [x] [test] Write CLI unit tests covering: config file loaded from working directory, missing config file uses defaults, `compile` exits 0 on success, `compile` exits 1 on validation error, `validate` reports all errors with --json, `validate` exits 0 on clean corpus, `describe` generates missing descriptions, `describe --llm` calls LLM provider, CLI runs in Node.js without Foundry globals (4 groups)
- [x] [impl] Implement `promptuarium.config.yaml` loader: reads `exemplarsDir`, `codexFile`, `outputDir`, `modus`, `llm` with documented defaults
- [x] [impl] Implement `promptuarium compile` subcommand: full pipeline (load → validate → optionally describe → compile → write); exit codes 0/1
- [x] [impl] Implement `promptuarium validate` subcommand: validation only; text output; `--json` for machine-readable; exit codes 0/1
- [x] [impl] Implement `promptuarium describe` subcommand: NL generation; `--force` and `--llm` flags; write-back to YAML

---

## Group 6: Foundry Runtime Face [wire]

- [x] [wire] Implement `module/src/index.ts`: register `game.dtk.register({ id: 'dtk-promptuarium', version, api: promptariumApi })` on `init`; fire `Hooks.callAll('dtk-promptuarium.ready')` after registration
- [x] [wire] Implement `PromptariumApi.validate()`: thin wrapper around `ExemplarSchema.safeParse()` from `@dtk/types/exemplar`; map Zod errors to `ValidationError[]`; never throws
- [x] [wire] Verify `module/src/` has zero `import` references to Node.js built-ins (`fs`, `path`, `level`, `js-yaml`) — CI lint rule

---

## Group 7: Integration & Smoke [smoke]

- [x] [smoke] CLI integration test: write a minimal YAML Exemplar corpus with one rule, one sequence, one action; run `promptuarium validate` — expect exit 0
- [x] [smoke] CLI integration test: introduce a cross-reference error; run `promptuarium validate --json` — expect exit 1 + JSON error output
- [x] [smoke] CLI integration test: run `promptuarium compile` on clean corpus; verify LevelDB pack files written and Foundry-importable (manual check in Foundry dev instance)
