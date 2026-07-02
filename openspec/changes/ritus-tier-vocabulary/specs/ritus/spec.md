## MODIFIED Requirements

### Requirement: Outcome tiers

A Ritus SHALL declare a `tiers` object defining system-wide net hit breakpoints
as a free vocabulary: a record mapping tier names to minimum net hits. Tiers
classify a roll result into named outcome bands — the tier with the highest
threshold ≤ the roll's net hits wins. Individual Rule Exemplars MAY override
tier breakpoints for specific actions.

Constraints:

- Tier names SHALL be lowercase slugs matching `/^[a-z][a-z0-9-]*$/`.
- Thresholds SHALL be nonnegative integers.
- At least one tier entry SHALL be present.
- Threshold values SHALL be unique across the vocabulary — the tier resolver
  maps a hit count to exactly one tier, so duplicate thresholds are ambiguous.

No tier names are reserved or required; `{critical, hit, glancing}` and
`{miss, hit, strong, exceptional}` are equally valid vocabularies.

#### Scenario: Minimal tiers accepted

- **WHEN** `tiers: { hit: 1 }` is declared
- **THEN** the Zod validator accepts it

#### Scenario: Custom vocabulary accepted losslessly

- **WHEN** `tiers: { miss: 0, hit: 1, strong: 4, exceptional: 6 }` is declared
- **THEN** the Zod validator accepts it and the parsed output contains all four
  entries unchanged — no keys are stripped

#### Scenario: Classic triple accepted

- **WHEN** `tiers: { critical: 4, hit: 1, glancing: 0 }` is declared
- **THEN** the Zod validator accepts it

#### Scenario: Empty tiers rejected

- **WHEN** `tiers: {}` is declared
- **THEN** the Zod validator returns an error — at least one tier is required

#### Scenario: Duplicate threshold values rejected

- **WHEN** `tiers: { hit: 1, strong: 1 }` is declared
- **THEN** the Zod validator returns an error identifying the ambiguous
  threshold

#### Scenario: Non-slug tier name rejected

- **WHEN** `tiers: { Critical: 4, hit: 1 }` is declared
- **THEN** the Zod validator returns an error — tier names must match
  `/^[a-z][a-z0-9-]*$/`

#### Scenario: Negative threshold rejected

- **WHEN** `tiers: { hit: -1 }` is declared
- **THEN** the Zod validator returns an error — thresholds are nonnegative
  integers

---

### Requirement: Ritus Zod validator

`@eldritchforgeworks/dtk-types/ritus` SHALL export a `RitusSchema` Zod schema and a derived
`Ritus` TypeScript type via `z.infer`, plus a `RitusTiers` type equal to
`Readonly<Record<string, number>>`. Calling `RitusSchema.parse(value)` SHALL
throw a `ZodError` on invalid input and return a typed `Ritus` on valid input.
`RitusSchema.safeParse(value)` SHALL return a discriminated union result.

The Ritus object SHALL be strict: unknown keys are rejected with an error, never
silently stripped.

The schema is intentionally lean — it carries no roll procedures, no pool
formulas, and no consequence logic. Those belong in `kind: rule` Exemplars.

#### Scenario: Valid Ritus parses cleanly

- **WHEN** `RitusSchema.parse({ id: "sr5e", name: "Shadowrun 5e", mechanic: "pool-count", sides: 6, threshold: 5, tiers: { critical: 4, hit: 1, glancing: 0 } })` is called
- **THEN** it returns the object typed as `Ritus` with no error

#### Scenario: Invalid Ritus throws ZodError

- **WHEN** `RitusSchema.parse({ id: "sr5e" })` is called with missing required fields
- **THEN** it throws a `ZodError` identifying each missing path

#### Scenario: Unknown key rejected loudly

- **WHEN** a Ritus object carries an unrecognized key (e.g. `bonusDice: 2`)
- **THEN** the Zod validator returns an error naming the unrecognized key — the
  key is not silently stripped
