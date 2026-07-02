# modus Specification

## Purpose
TBD - created by archiving change dtk-types. Update Purpose after archive.
## Requirements
### Requirement: Modus identity

A Modus SHALL carry an `id` string matching the Foundry game system ID exactly.
This id is used to register sheets, settings, and CONFIG entries.

#### Scenario: Valid id accepted

- **WHEN** a Modus is defined with `id: "veilrunner"`
- **THEN** the Zod validator accepts it

#### Scenario: Empty id rejected

- **WHEN** a Modus is defined with `id: ""`
- **THEN** the Zod validator returns an error

---

### Requirement: Actor type declarations

A Modus SHALL declare an `actors` record mapping actor type strings to actor type
configs. Each config SHALL reference a DataModel constructor (`dataModel`) and MAY
reference a Sheet class (`sheet`), a sheet label key (`sheetOptions.label`), and
trackable resource paths (`trackableAttributes`). At least one actor type is required.

Because DataModel and Sheet are Foundry classes (not plain data), the Modus schema
represents them as `unknown` at the Zod layer — structural validation is the module's
responsibility at registration time.

#### Scenario: Single actor type accepted

- **WHEN** `actors` declares one entry with a `dataModel` present
- **THEN** the validator accepts it

#### Scenario: Empty actors record rejected

- **WHEN** `actors: {}` is declared
- **THEN** the Zod validator returns an error — at least one actor type is required

---

### Requirement: Item type declarations

The `items` record, when declared, SHALL follow the same shape as `actors` and map item type strings to item type configs. If omitted or empty, dtk-systema skips item registration.

#### Scenario: Items omitted

- **WHEN** a Modus declares no `items` field
- **THEN** the validator accepts it — items are optional

#### Scenario: Items present with valid entries accepted

- **WHEN** `items` declares one or more entries each with a `dataModel`
- **THEN** the validator accepts it

---

### Requirement: DTK module plugin references

The `ritus`, `codex`, and `forma` fields, when declared, SHALL be typed as the corresponding contract types imported from `@eldritchforgeworks/dtk-types`. All three are optional — a system that uses only dtk-systema and dtk-promptuarium need not declare them.

#### Scenario: All three omitted

- **WHEN** a Modus declares no ritus, codex, or forma
- **THEN** the validator accepts it

#### Scenario: Only ritus declared

- **WHEN** a Modus declares a ritus but no codex or forma
- **THEN** the validator accepts it

---

### Requirement: Compendium pack declarations (dtk-promptuarium)

The `packs` array, when declared, SHALL contain compendium pack declarations consumed by dtk-promptuarium's compiler. Each entry specifies one Foundry compendium pack to produce:

```typescript
CompendiumPackDeclarationSchema = z.object({
  name:  z.string().min(1).regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  type:  z.enum(["Item", "Actor", "JournalEntry", "RollTable", "Macro"]),
  kinds: z.array(z.string()).min(1),  // Exemplar kinds routed to this pack
})
```

A `.superRefine()` check SHALL verify all `kinds` referenced in `packs[]` are also
declared in `types[]` (see below).

#### Scenario: Pack declarations accepted

- **WHEN** `packs: [{ name: "species", label: "Species", type: "Item", kinds: ["species"] }]` is declared
- **THEN** the validator accepts it

#### Scenario: Pack with kind absent from types rejected

- **WHEN** a pack declares `kinds: ["ritual"]` but `types[]` has no entry with `kind: "ritual"`
- **THEN** the validator returns an error via `.superRefine()`

#### Scenario: Packs omitted

- **WHEN** no `packs` field is declared
- **THEN** the validator accepts it (dtk-promptuarium skips compilation)

---

### Requirement: Type definitions with output mappers (dtk-promptuarium)

The `types` array, when declared, SHALL map Exemplar kinds to Foundry Document types with field-level output mappers consumed by dtk-promptuarium's compiler to transform Exemplar data into Foundry `system.*` fields:

```typescript
OutputMapperEntrySchema = z.object({
  exemplarPath: z.string().min(1),    // dot-notation source path in Exemplar
  systemPath:   z.string().min(1),    // dot-notation destination in system
  transform:    z.string().optional(), // optional expression applied to value
})

TypeDefinitionSchema = z.object({
  kind:         z.string().min(1),
  foundryType:  z.enum(["Item", "Actor"]),
  dataModel:    z.string().min(1),     // Foundry type string in CONFIG
  outputMapper: z.array(OutputMapperEntrySchema).default([]),
})
```

#### Scenario: Type definition with output mapper accepted

- **WHEN** `types: [{ kind: "species", foundryType: "Item", dataModel: "species", outputMapper: [{ exemplarPath: "name", systemPath: "system.name" }] }]` is declared
- **THEN** the validator accepts it

#### Scenario: Type definition without output mapper accepted (empty array default)

- **WHEN** a type definition omits `outputMapper`
- **THEN** the validator accepts it; `outputMapper` defaults to `[]`

#### Scenario: Types omitted

- **WHEN** no `types` field is declared
- **THEN** the validator accepts it (dtk-promptuarium skips compilation)

---

### Requirement: Roll schema declarations

The `schemas` array, when declared, SHALL contain supplementary Alea roll schema registrations beyond those embedded in the Ritus. The field MAY be empty or omitted entirely.

#### Scenario: Schemas omitted

- **WHEN** no `schemas` field is declared
- **THEN** the validator accepts it, treating schemas as an empty array

---

### Requirement: Settings declarations

A Modus MAY declare a `settings` array of setting configs. Each entry SHALL include
`key` (string), `type` (a constructor reference — `String`, `Number`, `Boolean`),
`default` (any), `scope` (`"world"` | `"client"`), and optionally `name`, `hint`,
`config`, `choices`, `onChange`. The `worldSchemaVersion` setting is injected
automatically by dtk-systema and MUST NOT be declared by the Modus.

#### Scenario: Settings omitted

- **WHEN** `settings` is omitted
- **THEN** the validator accepts it

#### Scenario: Setting with all required fields

- **WHEN** a setting entry has `key`, `type`, `default`, and `scope`
- **THEN** the validator accepts it

#### Scenario: Setting missing key rejected

- **WHEN** a setting entry omits `key`
- **THEN** the Zod validator returns an error

---

### Requirement: Schema version

The `schemaVersion` field, when declared, SHALL be a semver string used for world migration support. When present, dtk-systema registers and runs migrations on the `ready` hook.

#### Scenario: Schema version omitted

- **WHEN** `schemaVersion` is omitted
- **THEN** the validator accepts it — migration is skipped

#### Scenario: Schema version present

- **WHEN** `schemaVersion: "1.2.0"` is declared
- **THEN** the validator accepts it

---

### Requirement: Modus Zod validator

`@eldritchforgeworks/dtk-types/modus` SHALL export a `ModusSchema` Zod schema and a derived `Modus`
TypeScript type. The schema uses `.passthrough()` on Foundry-class fields
(`dataModel`, `sheet`) to avoid runtime failures on non-serialisable constructors.

#### Scenario: Valid Modus parses cleanly

- **WHEN** `ModusSchema.parse(validModus)` is called
- **THEN** it returns the object typed as `Modus`

#### Scenario: Missing id throws ZodError

- **WHEN** `ModusSchema.parse({})` is called
- **THEN** it throws a `ZodError` citing `id` as missing

---

### Requirement: Modus type guard

`@eldritchforgeworks/dtk-types/modus` SHALL export an `isModus(value: unknown): value is Modus`
type guard backed by `ModusSchema.safeParse`.

#### Scenario: Valid Modus narrows type

- **WHEN** `isModus(validModus)` is called
- **THEN** it returns `true` and TypeScript narrows the type

#### Scenario: Non-object returns false

- **WHEN** `isModus(42)` is called
- **THEN** it returns `false` without throwing

