## Why

Requested by: DTK Officina change init-m0-delivery-skeleton (M0; this fix is needed by Officina M3, filed now).

`promptuarium compile` is silently a no-op. Three verified defects:

1. **Compile writes zero packs.** `runCompile` in `packages/promptuarium/src/cli/commands/compile.ts` calls `compiler.compile(corpus, [], new Date().toISOString())` — a hard-coded empty `ModusOutputMapper[]`. The Modus declared in `promptuarium.config.yaml` (the `modus` config key exists in `src/cli/config.ts` but is never read by any command) is never loaded, so `ExemplarCompiler.compile` iterates zero mappers and writes zero packs — while printing "Compile complete." and exiting 0. This contradicts `openspec/specs/cli/spec.md` ("Compile exits 0 on success … **THEN** … LevelDB packs are written") and `openspec/specs/exemplar-compiler/spec.md` ("LevelDB pack written per Modus compendium declaration").
2. **Divergent pack key/value encoding.** Promptuarium's `LevelDBCompendiumTarget` writes key `` `!${entry.type}!${entry._id}` `` (document *type*, e.g. `ritus`) with `valueEncoding: 'json'`; shadowrun's `scripts/build-packs.mjs` writes key `` `!items!${doc._id}` `` (Foundry *collection* name) with raw `utf8` string values. Foundry's LevelDB pack format keys by collection (`!items!`, `!actors!`), so the two tools produce incompatible databases and only shadowrun's keying is loadable as an Item pack.
3. **Stale system id in shadowrun packs.** Both `packs` entries in `packages/shadowrun/module.json` (`sr-ritus`, `sr-sequences`) declare `"system": "veilrunner"`, a leftover id from a previous project.

## What Changes

Module: `dtk-promptuarium` / npm package `@eldritchforgeworks/dtk-promptuarium` (FREE tier); plus `dtk-shadowrun` (example system). Contracts: Exemplar (compiled content) and Modus (pack + outputMapper declarations).

- **Load Modus in compile**: add a Modus loader to the CLI (read the YAML at `config.modus`, validate with `@eldritchforgeworks/dtk-types` Modus schema, derive `ModusOutputMapper[]` from its compendium/outputMapper declarations) and pass real mappers to `ExemplarCompiler.compile`. Compiling with a configured Modus that yields zero mappers, or with no `modus` configured, SHALL be a hard error — never a silent empty success.
- **Canonical pack encoding**: adopt Foundry's own convention — key `` `!{collection}!{_id}` `` where collection derives from the pack's document class (Item → `items`, Actor → `actors`), JSON-serialized values. Fix `LevelDBCompendiumTarget` to key by collection instead of `entry.type`; converge `scripts/build-packs.mjs` on the same target (or replace it with a promptuarium invocation) so one encoding exists in the ecosystem.
- **Fix shadowrun manifest**: correct or remove the stale `"system": "veilrunner"` on both pack entries in `packages/shadowrun/module.json`.

## Non-goals

- No changes to validation (`promptuarium validate`) or NL generation (`describe`) behaviour.
- No new Modus features — only consuming what the Modus contract already declares.
- No migration tooling for previously compiled packs (none exist in the wild; compile currently writes nothing).

## Capabilities

### New Capabilities

*(none)*

### Modified Capabilities

- `cli`: `promptuarium compile` must load the configured Modus and fail loudly when no output mappers result.
- `exemplar-compiler`: canonical LevelDB key/value encoding requirement added.

## Impact

- `packages/promptuarium/src/cli/commands/compile.ts`, `src/cli/config.ts` consumers, new Modus-loading adapter, `src/adapters/node/LevelDBCompendiumTarget.ts` + its tests.
- `packages/shadowrun/scripts/build-packs.mjs`, `packages/shadowrun/module.json`.
- **Downstream**: Officina M3 (compiled compendium content in generated systems) depends on compile actually writing loadable packs.
