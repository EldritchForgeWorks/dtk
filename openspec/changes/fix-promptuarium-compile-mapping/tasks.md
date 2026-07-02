## 1. Modus loading in the CLI

- [ ] 1.1 [test] Failing test: `runCompile` with a config whose `modus` points at a valid Modus YAML produces mappers and writes packs (in-memory target)
- [ ] 1.2 [port] Declare `IModusSource` port (load + validate Modus, return `ModusOutputMapper[]`)
- [ ] 1.3 [stub] In-memory Modus source test double
- [ ] 1.4 [impl] `YamlModusSource` node adapter: read `config.modus`, validate via `@dtk/types` Modus schema, map compendium/outputMapper declarations to `ModusOutputMapper[]`
- [ ] 1.5 [impl] Wire into `runCompile`: replace the hard-coded `[]`; error (exit 1, stderr message) when `modus` is unset or yields zero mappers
- [ ] 1.6 [test] Failing-path tests: missing `modus` key, unreadable file, invalid Modus, zero mappers — all exit 1 with diagnostics

## 2. Canonical pack encoding

- [ ] 2.1 [test] Failing test: `LevelDBCompendiumTarget.write` keys entries as `!items!{_id}` for Item-class packs
- [ ] 2.2 [impl] Fix `LevelDBCompendiumTarget` to derive the key collection from the pack's document class (Item → `items`, Actor → `actors`) instead of `entry.type`
- [ ] 2.3 [impl] Converge `packages/shadowrun/scripts/build-packs.mjs` on the same encoding (or replace it with `promptuarium compile`); document the canonical encoding decision
- [ ] 2.4 [smoke] Compile a sample corpus, open the pack in Foundry, confirm documents list in the compendium

## 3. Shadowrun manifest fix

- [ ] 3.1 Remove or correct the stale `"system": "veilrunner"` on both `packs` entries in `packages/shadowrun/module.json`
- [ ] 3.2 [smoke] Rebuild shadowrun packs; confirm both compendia open without system-mismatch warnings in Foundry

## 4. Spec sync

- [ ] 4.1 Confirm behaviour matches the modified `cli` and `exemplar-compiler` spec deltas; run full promptuarium test suite
