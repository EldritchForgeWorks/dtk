## 1. Config-driven output mappers and sequence sources

- [ ] 1.1 [test] Failing test: `loadConfig` parses an `outputs` array of `{packId, documentType, kinds, fieldMap}` entries and an optional `sequences: {dir, packId}` key from `promptuarium.config.yaml`
- [ ] 1.2 [impl] Extend `PromptariumConfig` in `src/cli/config.ts` with typed `outputs` and `sequences` keys, parsed the same way as `exemplarsDir`/`outputDir`/`modus`; a malformed section must surface as a diagnostic, not be swallowed by `loadConfig`'s catch-all default fallback
- [ ] 1.3 [test] Failing test: `runCompile` with a config declaring `outputs` passes real mappers to `ExemplarCompiler.compile` and writes one pack per entry (in-memory target)
- [ ] 1.4 [impl] Wire into `runCompile`: replace the hard-coded `[]` with mappers from `config.outputs`
- [ ] 1.5 [impl] Hard-error path: exit 1 with a stderr diagnostic when the configuration yields zero pack outputs (missing or empty `outputs` and no `sequences` source) or any `outputs` entry is malformed — never a silent zero-pack success
- [ ] 1.6 [test] Failing-path tests: missing `outputs`, empty `outputs`, malformed entry (missing/mistyped `packId`/`documentType`/`kinds`/`fieldMap`) — all exit 1 with diagnostics and write no packs
- [ ] 1.7 [test] Failing test: a `sequences.dir` of valid `MechanicSequenceExemplar` documents compiles into a pack of `{_id, name, type: 'dtk.sequence', system: <bare document>, flags: {}}` items (envelope matches `packages/shadowrun/src/packs/sr-sequences/01-RangedAttack.json`)
- [ ] 1.8 [impl] Sequence-source compilation: read `config.sequences.dir`, validate each document against `MechanicSequenceExemplarSchema` from `@eldritchforgeworks/dtk-types`, wrap in the fixed envelope (stable `_id` derived from the sequence `id`; `name` from an optional source `name`, falling back to `id`), write via the same compendium target
- [ ] 1.9 [test] Failing-path test: an invalid sequence document exits 1 with a file-and-error diagnostic and writes no packs

## 2. Canonical pack encoding

- [ ] 2.1 [test] Failing test: `LevelDBCompendiumTarget.write` keys entries as `!items!{_id}` for Item-class packs
- [ ] 2.2 [impl] Fix `LevelDBCompendiumTarget` to derive the key collection from the pack's document class (Item → `items`, Actor → `actors`) instead of `entry.type`
- [ ] 2.3 [impl] Converge `packages/shadowrun/scripts/build-packs.mjs` on the same encoding (or replace it with `promptuarium compile`); document the canonical encoding decision
- [ ] 2.4 [smoke] Compile a sample corpus, open the pack in Foundry, confirm documents list in the compendium

## 3. Shadowrun manifest fix

- [ ] 3.1 Remove or correct the stale `"system": "veilrunner"` on both `packs` entries in `packages/shadowrun/module.json`
- [ ] 3.2 [smoke] Rebuild shadowrun packs; confirm both compendia open without system-mismatch warnings in Foundry

## 4. Spec sync

- [ ] 4.1 Confirm behaviour matches the modified `cli` and `exemplar-compiler` spec deltas (config-driven `outputs`, sequence envelope, canonical encoding); run full promptuarium test suite
