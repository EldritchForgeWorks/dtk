# Spec: corpus-validator

The corpus validator performs two passes over the Exemplar corpus: schema validation
(each Exemplar against `ExemplarSchema`) and cross-reference checks (ids referenced
by `parent`, `ref`, and `sequence` fields actually exist in the corpus).

## ADDED Requirements

### Requirement: Per-Exemplar schema validation

The validator SHALL run `ExemplarSchema.safeParse()` on each raw Exemplar object. For
each failure, it SHALL record a `ValidationError` with `{ exemplarId, field, message }`.
Validation of all Exemplars runs to completion regardless of individual failures — no
early exit.

#### Scenario: Valid Exemplar produces no errors

- **WHEN** an Exemplar passes `ExemplarSchema.safeParse()`
- **THEN** no `ValidationError` is recorded for that Exemplar

#### Scenario: Invalid Exemplar records field-level errors

- **WHEN** an Exemplar has `pool: null` (invalid for kind: rule)
- **THEN** a `ValidationError` with the field path `"pool"` is recorded

#### Scenario: All Exemplars validated before errors reported

- **WHEN** three of ten Exemplars are invalid
- **THEN** errors from all three are collected; validation does not stop at the first failure

---

### Requirement: Cross-reference validation — parent ids

The validator SHALL check that `parent` ids referenced by `kind: "discipline"` (expects an archetype) and `kind: "vocation"` (expects a discipline) exist in the corpus and are of the expected kind.

#### Scenario: Discipline with valid archetype parent passes

- **WHEN** `discipline.parent = "street-samurai"` and `"street-samurai"` is a valid archetype in the corpus
- **THEN** no cross-reference error is recorded

#### Scenario: Discipline with missing parent fails

- **WHEN** `discipline.parent = "ghost-archetype"` and no Exemplar with that id exists
- **THEN** a `ValidationError` is recorded: `{ exemplarId: "...", field: "parent", message: "referenced id 'ghost-archetype' not found in corpus" }`

#### Scenario: Discipline with wrong-kind parent fails

- **WHEN** `discipline.parent = "elf-species"` and `"elf-species"` is `kind: "species"` not `"archetype"`
- **THEN** a `ValidationError` is recorded noting the kind mismatch

---

### Requirement: Cross-reference validation — ref and sequence ids

The validator SHALL check that `ref` ids in `reference` grants and `sequence` ids in `action` Exemplars exist in the corpus. Kind checking is
enforced only where the contract specifies a required kind (e.g., `action.sequence`
must reference a `kind: "sequence"` Exemplar).

#### Scenario: Action with valid sequence ref passes

- **WHEN** `action.sequence = "full-attack-seq"` and that id is a `kind: "sequence"` Exemplar
- **THEN** no cross-reference error is recorded

#### Scenario: Action with missing sequence ref fails

- **WHEN** `action.sequence = "nonexistent-seq"` and no such Exemplar exists
- **THEN** a `ValidationError` is recorded for that action

---

### Requirement: Slug uniqueness check

The validator SHALL ensure no two Exemplars in the corpus share the same `id` slug.
Duplicate ids produce a `ValidationError` for each duplicate entry.

#### Scenario: Unique ids pass

- **WHEN** all Exemplar ids in the corpus are distinct
- **THEN** no uniqueness errors are recorded

#### Scenario: Duplicate id produces errors for all duplicates

- **WHEN** two Exemplars both declare `id: "ranged-attack"`
- **THEN** `ValidationError` entries are recorded for both Exemplars

---

### Requirement: Structured error output

The validator SHALL return a `ValidationResult` with `{ errors: ValidationError[], valid: boolean }`.
`valid` is `true` iff `errors` is empty. Error output SHALL be serialisable to JSON for
CI pipeline consumption.

#### Scenario: Empty errors means valid

- **WHEN** all Exemplars pass validation and cross-reference checks
- **THEN** `result.valid === true` and `result.errors` is empty

#### Scenario: ValidationResult is JSON-serialisable

- **WHEN** `JSON.stringify(result)` is called on a result with errors
- **THEN** it produces valid JSON without throwing
