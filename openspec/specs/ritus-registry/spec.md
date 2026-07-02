# ritus-registry Specification

## Purpose
TBD - created by archiving change dtk-alea. Update Purpose after archive.
## Requirements
### Requirement: Ritus registration via AleaApi

`AleaApi.registerRitus(ritus: Ritus)` SHALL validate the provided Ritus via
`RitusSchema` from `@eldritchforgeworks/dtk-types/ritus` and store it keyed by `ritus.id`. Duplicate
registrations (same id) SHALL overwrite the previous entry and log a console warning.
An invalid Ritus (fails schema validation) SHALL throw a descriptive error.

#### Scenario: Valid Ritus is stored

- **WHEN** `AleaApi.registerRitus(validRitus)` is called with a schema-valid Ritus
- **THEN** the Ritus is retrievable by id from the registry

#### Scenario: Duplicate Ritus warns and overwrites

- **WHEN** `AleaApi.registerRitus()` is called twice with the same `id`
- **THEN** a console warning is logged and the second entry replaces the first

#### Scenario: Invalid Ritus throws

- **WHEN** `AleaApi.registerRitus({ id: "bad" })` is called with a schema-invalid Ritus
- **THEN** a descriptive error is thrown identifying the missing fields

---

### Requirement: Ritus lookup for roll resolution

The domain SHALL provide `RitusRegistry.get(systemId): RitusConfig | null`. Returns
the registered `RitusConfig` (mechanic, threshold, tiers snapshot) for the given
system id, or `null` if not registered. The registry never fetches from compendium —
it only returns what was explicitly registered.

#### Scenario: Registered Ritus returned by id

- **WHEN** `RitusRegistry.get("sr5e")` is called after `sr5e` Ritus was registered
- **THEN** the stored `RitusConfig` snapshot is returned

#### Scenario: Unregistered id returns null

- **WHEN** `RitusRegistry.get("unknown-system")` is called
- **THEN** `null` is returned without throwing

---

### Requirement: Per-rule Ritus overrides applied at lookup time

`RitusRegistry.resolve(systemId, ruleOverrides)` SHALL return a merged `RitusConfig` with per-rule overrides applied on top of the base Ritus. Rule Exemplars may declare `mechanic`, `threshold`, and `tiers` overrides; the base Ritus is not mutated.

#### Scenario: Per-rule threshold override applied

- **WHEN** the base Ritus has `threshold: 5` and the Rule Exemplar declares `threshold: 4`
- **THEN** `resolve()` returns a config with `threshold: 4`

#### Scenario: Absent override preserves base value

- **WHEN** the Rule Exemplar declares no `threshold` override
- **THEN** `resolve()` returns the base Ritus threshold unchanged

