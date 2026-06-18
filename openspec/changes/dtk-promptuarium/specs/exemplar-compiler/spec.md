# Spec: exemplar-compiler

The Exemplar compiler reads validated Exemplar objects from the corpus and writes
Foundry-compatible LevelDB compendium pack entries. It is the write phase of the
build pipeline — it never executes unless `CorpusValidator` has passed with zero errors.

## ADDED Requirements

### Requirement: Two-phase compile — validate then write

The compiler SHALL run full corpus validation as phase 1 before writing any output.
If validation produces any errors, the compile halts and reports all errors to stdout;
no LevelDB data is written. Only when validation passes with zero errors does phase 2
(write) begin.

#### Scenario: Compile halts on validation errors

- **WHEN** one Exemplar in the corpus fails schema validation
- **THEN** all validation errors are reported and no LevelDB output is written

#### Scenario: Compile writes after clean validation

- **WHEN** all Exemplars pass schema validation and cross-reference checks
- **THEN** `ICompendiumTarget.write()` is called with the compiled entries

---

### Requirement: Exemplar → Foundry document shape transformation

For each validated Exemplar, the compiler SHALL produce a `CompiledEntry` containing:
- `_id` — a stable Foundry-compatible id derived from the Exemplar's `id` slug
- `name` — from `exemplar.name`
- `type` — the Foundry item/actor type derived from the Exemplar `kind`
- `system` — fields mapped from Exemplar data via the Modus `outputMapper` spec
- `flags['dtk-promptuarium']` — the original Exemplar id, kind, version, and source slug

The `outputMapper` is a string declared in `modus.yaml` that specifies how Exemplar
fields map to `system.*` fields. In v1 this is a flat JSON-path key map.

#### Scenario: Compiled entry has correct type from kind

- **WHEN** an Exemplar of `kind: "item"` is compiled
- **THEN** `CompiledEntry.type` matches the Foundry item type registered for that kind

#### Scenario: Compiled entry carries promptuarium flag

- **WHEN** any Exemplar is compiled
- **THEN** `flags['dtk-promptuarium'].exemplarId` equals the Exemplar's `id`

---

### Requirement: LevelDB pack written per Modus compendium declaration

The Modus declares which compendium packs to produce (e.g., `species`, `rules`,
`items`). The compiler SHALL write one LevelDB database per declared pack, with each
entry stored as `key=!{type}!{id}`, `value=JSON(CompiledEntry)`.

#### Scenario: One pack file per Modus compendium declaration

- **WHEN** the Modus declares two compendium packs (`species` and `rules`)
- **THEN** two LevelDB databases are written at the output paths

#### Scenario: Entries in correct pack by kind

- **WHEN** `kind: "species"` Exemplars are compiled and `species` pack is declared
- **THEN** all species entries appear in the `species` pack database

---

### Requirement: Idempotent compile output

Running `promptuarium compile` twice with the same input SHALL produce byte-identical
LevelDB output. Compiled entry ids SHALL be deterministic (derived from Exemplar id
slug, not random or timestamp-based).

#### Scenario: Second compile produces identical output

- **WHEN** `promptuarium compile` is run twice on unchanged YAML files
- **THEN** the LevelDB output files are byte-identical between runs
