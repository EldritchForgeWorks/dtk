## 1. Config-driven output mappers and sequence sources

- [x] 1.1 [test] Failing test: `loadConfig` parses an `outputs` array of `{packId, documentType, kinds, fieldMap}` entries and an optional `sequences: {dir, packId}` key from `promptuarium.config.yaml`
- [x] 1.2 [impl] Extend `PromptariumConfig` in `src/cli/config.ts` with typed `outputs` and `sequences` keys, parsed the same way as `exemplarsDir`/`outputDir`/`modus`; a malformed section must surface as a diagnostic, not be swallowed by `loadConfig`'s catch-all default fallback
      *(`loadConfig` now only falls back to `DEFAULTS` on `ENOENT`; any other read/YAML-parse failure throws `ConfigParseError`.)*
- [x] 1.3 [test] Failing test: `runCompile` with a config declaring `outputs` passes real mappers to `ExemplarCompiler.compile` and writes one pack per entry (in-memory target)
      *(Written as a real-filesystem integration test — temp exemplars dir + temp LevelDB output, read back via `classic-level` directly — rather than an in-memory double, since `runCompile` wires the real node adapters and isn't itself port-injectable.)*
- [x] 1.4 [impl] Wire into `runCompile`: replace the hard-coded `[]` with mappers from `config.outputs`
- [x] 1.5 [impl] Hard-error path: exit 1 with a stderr diagnostic when the configuration yields zero pack outputs (missing or empty `outputs` and no `sequences` source) or any `outputs` entry is malformed — never a silent zero-pack success
- [x] 1.6 [test] Failing-path tests: missing `outputs`, empty `outputs`, malformed entry (missing/mistyped `packId`/`documentType`/`kinds`/`fieldMap`) — all exit 1 with diagnostics and write no packs
- [x] 1.7 [test] Failing test: a `sequences.dir` of valid `MechanicSequenceExemplar` documents compiles into a pack of `{_id, name, type: 'dtk.sequence', system: <bare document>, flags: {}}` items (envelope matches `packages/shadowrun/src/packs/sr-sequences/01-RangedAttack.json`)
- [x] 1.8 [impl] Sequence-source compilation: read `config.sequences.dir`, validate each document against `MechanicSequenceExemplarSchema` from `@eldritchforgeworks/dtk-types`, wrap in the fixed envelope (stable `_id` derived from the sequence `id`; `name` from an optional source `name`, falling back to `id`), write via the same compendium target
      *(`name` is read from the RAW parsed YAML, not the schema-validated result — `MechanicSequenceExemplarSchema` has no `name` field and non-strict Zod silently strips it, confirmed by reading the schema directly.)*
- [x] 1.9 [test] Failing-path test: an invalid sequence document exits 1 with a file-and-error diagnostic and writes no packs
      *(All-or-nothing: sequence documents are validated BEFORE any pack is written, so an invalid sequence blocks the exemplar packs too, not just the sequence pack.)*

## 2. Canonical pack encoding

- [x] 2.1 [test] Failing test: `LevelDBCompendiumTarget.write` keys entries as `!items!{_id}` for Item-class packs
- [x] 2.2 [impl] Fix `LevelDBCompendiumTarget` to derive the key collection from the pack's document class (Item → `items`, Actor → `actors`) instead of `entry.type`
      *(Added `PackDocumentClass` (`'Item' | 'Actor'`) to `ICompendiumTarget.write` and `ModusOutputMapper`/`OutputMapperConfig`, defaulting to `'Item'` — every kind compiled today is Item-class; the mechanism is real, not hardcoded, for when an Actor-producing kind appears.)*
- [x] 2.3 [impl] Converge `packages/shadowrun/scripts/build-packs.mjs` on the same encoding (or replace it with `promptuarium compile`); document the canonical encoding decision
      *(It was already on the canonical `!items!{_id}` encoding — it's the proven reference the promptuarium fix converged TOWARD. Added a comment marking it canonical and cross-referencing `PackDocumentClass`. Not replaced with `promptuarium compile` in this change — retiring it is upstream's own future cleanup, per design.md's Non-Goals.)*
- [x] 2.4 [smoke] Compile a sample corpus, open the pack in Foundry, confirm documents list in the compendium
      *(Real CLI compile against a temp corpus, packs read back via `classic-level` directly, confirmed exact key format and value shape — NOT yet verified against a live Foundry v13 install. That verification happens downstream in Officina's `m3-compendium-studio` task 6.1, which installs the resulting packs in a real Foundry instance.)*

## 3. Shadowrun manifest fix

- [x] 3.1 Remove or correct the stale `"system": "veilrunner"` on both `packs` entries in `packages/shadowrun/module.json`
      *(Removed — `dtk-shadowrun` is a module, not scoped to one system; there's no single correct system id to put there instead.)*
- [x] 3.2 [smoke] Rebuild shadowrun packs; confirm both compendia open without system-mismatch warnings in Foundry
      *(`npm run build:packs` reruns clean — same content, `module.json`'s stale key removed. Foundry-side confirmation deferred to the same live-install check as 2.4.)*

## 4. Spec sync

- [x] 4.1 Confirm behaviour matches the modified `cli` and `exemplar-compiler` spec deltas (config-driven `outputs`, sequence envelope, canonical encoding); run full promptuarium test suite
      *(66/66 tests pass; `npm run build` (both CLI and lib targets) succeeds. `npm run typecheck` has pre-existing failures unrelated to this change — confirmed via `git stash` that the same errors, same line numbers, exist on `main` before this change; none are in any file this change touches.)*
