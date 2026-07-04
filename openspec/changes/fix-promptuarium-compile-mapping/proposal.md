## Why

Requested by: DTK Officina change init-m0-delivery-skeleton (M0; this fix is needed by Officina M3, filed now).

`promptuarium compile` is silently a no-op. Three verified defects:

1. **Compile writes zero packs.** `runCompile` in `packages/promptuarium/src/cli/commands/compile.ts` calls `compiler.compile(corpus, [], new Date().toISOString())` — a hard-coded empty `ModusOutputMapper[]`. No mapper source exists anywhere: `ExemplarCompiler.compile` iterates zero mappers and writes zero packs — while printing "Compile complete." and exiting 0. This contradicts `openspec/specs/cli/spec.md` ("Compile exits 0 on success … **THEN** … LevelDB packs are written").
2. **Divergent pack key/value encoding.** Promptuarium's `LevelDBCompendiumTarget` writes key `` `!${entry.type}!${entry._id}` `` (document *type*, e.g. `ritus`) with `valueEncoding: 'json'`; shadowrun's `scripts/build-packs.mjs` writes key `` `!items!${doc._id}` `` (Foundry *collection* name) with raw `utf8` string values. Foundry's LevelDB pack format keys by collection (`!items!`, `!actors!`), so the two tools produce incompatible databases and only shadowrun's keying is loadable as an Item pack.
3. **Stale system id in shadowrun packs.** Both `packs` entries in `packages/shadowrun/module.json` (`sr-ritus`, `sr-sequences`) declare `"system": "veilrunner"`, a leftover id from a previous project.

> **Design supersession (2026-07-04).** An earlier draft of this change derived
> mappers from the Modus declared in `promptuarium.config.yaml`. That mechanism is
> rejected — jointly with Officina's `m3-compendium-studio` design (decisions 2–3):
> (a) `ModusSchema` (`packages/types/src/modus/schema.ts`) has **zero** pack/mapper
> fields today, so the Modus-driven design silently assumed a schema capability
> that doesn't exist; (b) compendium packaging is a build-output concern — pushing
> it into the runtime Modus contract (which GMs edit for actor/item type modeling)
> conflates two concerns and forces a `dtk-types` version bump for a build-tool
> configuration detail. Mapper derivation is therefore **config-driven**: a new
> `outputs` section in `promptuarium.config.yaml`, owned and regenerated
> deterministically by Officina on export (its side of the contract; not this
> change's concern). DTK can layer Modus-derived defaults later without breaking
> this contract.

## What Changes

Module: `dtk-promptuarium` / npm package `@eldritchforgeworks/dtk-promptuarium` (FREE tier); plus `dtk-shadowrun` (example system). Contracts: Exemplar (compiled content) and MechanicSequenceExemplar (sequence content). Modus is untouched.

- **Config-driven output mappers**: add an `outputs` section to `promptuarium.config.yaml` — an array of `{packId, documentType, kinds, fieldMap}` entries, structurally identical to `ModusOutputMapper` — parsed and typed in `src/cli/config.ts` alongside the existing `exemplarsDir`/`outputDir`/`modus` keys. `runCompile` passes these mappers to `ExemplarCompiler.compile`, replacing the hard-coded `[]`. Compiling with a configuration that yields zero pack outputs (missing or empty `outputs`, and no `sequences` source) SHALL be a hard error (exit 1, clear diagnostic) — never a silent zero-pack success. A malformed `outputs` entry is likewise a hard error, not a fall-through to defaults.
- **Sequence-source compilation**: add an optional `sequences` config key (`{dir, packId}`) pointing at a directory of `MechanicSequenceExemplar` documents (the M2 shape `dtk-alea` executes — `MechanicSequenceExemplarSchema` in `@eldritchforgeworks/dtk-types`). Compile validates each document and writes it as a `dtk.sequence` pack item using the fixed envelope proven by `packages/shadowrun/src/packs/sr-sequences/01-RangedAttack.json`: `{_id, name, type: 'dtk.sequence', system: <bare MechanicSequenceExemplar document>, flags: {}}`. A sibling config key (not an `outputs` entry) because sequences bypass the exemplar corpus/`fieldMap` pipeline entirely: they come from their own source directory, validate against a different schema, and use a fixed envelope with `system` = the bare document. This makes promptuarium the single pack writer for both the general Exemplar union and sequences; retiring shadowrun's ad hoc script is a follow-on, not a gate here — but nothing in this design blocks it.
- **Canonical pack encoding**: adopt Foundry's own convention — key `` `!{collection}!{_id}` `` where collection derives from the pack's document class (Item → `items`, Actor → `actors`), JSON-serialized values. Fix `LevelDBCompendiumTarget` to key by collection instead of `entry.type`; converge `scripts/build-packs.mjs` on the same target (or replace it with a promptuarium invocation) so one encoding exists in the ecosystem.
- **Fix shadowrun manifest**: correct or remove the stale `"system": "veilrunner"` on both pack entries in `packages/shadowrun/module.json`.

## Non-goals

- No changes to validation (`promptuarium validate`) or NL generation (`describe`) behaviour.
- No Modus involvement: no Modus loading in the CLI, no `IModusSource` port, no pack/mapper fields added to `ModusSchema`, no `dtk-types` bump for this change.
- No `outputs`-generation tooling — Officina owns and regenerates the `outputs` section on export (its `m3-compendium-studio` change, tasks 4.1/4.3); promptuarium only consumes whatever is committed in the config it's given.
- No retirement of `packages/shadowrun/scripts/build-packs.mjs` in this change (encoding convergence only).
- No migration tooling for previously compiled packs (none exist in the wild; compile currently writes nothing).

## Capabilities

### New Capabilities

*(none)*

### Modified Capabilities

- `cli`: `promptuarium compile` must derive output mappers from the config's `outputs` section, compile configured sequence sources, and fail loudly when the configuration yields zero pack outputs.
- `exemplar-compiler`: canonical LevelDB key/value encoding requirement added; sequence pack envelope requirement added.

## Impact

- `packages/promptuarium/src/cli/config.ts` (new `outputs` + `sequences` keys and their validation), `src/cli/commands/compile.ts`, new sequence-source compile step, `src/adapters/node/LevelDBCompendiumTarget.ts` + its tests.
- `packages/shadowrun/scripts/build-packs.mjs`, `packages/shadowrun/module.json`.
- **Downstream**: Officina M3 (compiled compendium content in generated systems) depends on compile actually writing loadable packs; its export regenerates the `outputs` section this change consumes.
