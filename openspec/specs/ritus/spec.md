# ritus Specification

## Purpose
TBD - created by archiving change dtk-types. Update Purpose after archive.
## Requirements
### Requirement: Ritus identity

A Ritus SHALL carry a stable machine-readable `id` (non-empty string, no spaces)
and a human-readable `name` (localizable string). These identify the Ritus in
error messages, debug output, and the Alea registry.

#### Scenario: Valid identity accepted

- **WHEN** a Ritus is defined with `id: "veilrunner"` and `name: "Veilrunner Dice"`
- **THEN** the Zod validator accepts it without error

#### Scenario: Missing id rejected

- **WHEN** a Ritus object omits the `id` field
- **THEN** the Zod validator returns an error identifying the missing field

#### Scenario: Empty id rejected

- **WHEN** a Ritus object has `id: ""`
- **THEN** the Zod validator returns an error

---

### Requirement: Ritus mechanic type

A Ritus SHALL declare a `mechanic` discriminator from the fixed enumeration of
supported dice mechanics. This is the system-wide default mechanic; individual
Rule Exemplars MAY override it. Valid values: `standard`, `pool-count`,
`step-die`, `exploding`, `advantage-disadvantage`, `opposed`, `target-number`,
`drama-die`, `custom`.

#### Scenario: Known mechanic accepted

- **WHEN** a Ritus declares `mechanic: "pool-count"`
- **THEN** the Zod validator accepts it

#### Scenario: Unknown mechanic rejected

- **WHEN** a Ritus declares `mechanic: "dice-fest"`
- **THEN** the Zod validator returns an error listing valid values

---

### Requirement: Hit threshold

A Ritus SHALL declare a numeric `threshold` — the minimum die face that counts
as a hit under the system's resolution mechanic. This is the system-wide default;
individual Rule Exemplars MAY override it per action.

#### Scenario: Valid threshold accepted

- **WHEN** a Ritus declares `threshold: 5`
- **THEN** the Zod validator accepts it

#### Scenario: Zero threshold rejected

- **WHEN** a Ritus declares `threshold: 0`
- **THEN** the Zod validator returns an error — threshold must be a positive integer

#### Scenario: Non-integer threshold rejected

- **WHEN** a Ritus declares `threshold: 4.5`
- **THEN** the Zod validator returns an error

---

### Requirement: Outcome tiers

A Ritus SHALL declare a `tiers` object defining system-wide net hit breakpoints.
Tiers classify a roll result into named outcome bands. Individual Rule Exemplars
MAY override tier breakpoints for specific actions.

Required field: `hit` — the minimum net hits for a standard hit (positive integer).

Optional fields:
- `critical` — minimum net hits for a critical/strong hit (integer ≥ `hit`)
- `glancing` — net hits that produce a glancing/partial hit (integer, typically 0 or 1, must be < `hit`)

`miss` is implicit — any result below `glancing` (or below `hit` if `glancing`
is absent) is a miss. No explicit `miss` threshold is declared.

#### Scenario: Minimal tiers accepted

- **WHEN** `tiers: { hit: 1 }` is declared
- **THEN** the Zod validator accepts it

#### Scenario: Full tiers accepted

- **WHEN** `tiers: { critical: 4, hit: 1, glancing: 0 }` is declared
- **THEN** the Zod validator accepts it

#### Scenario: Critical below hit rejected

- **WHEN** `tiers: { critical: 0, hit: 1 }` is declared
- **THEN** the Zod validator returns an error — critical must be ≥ hit

#### Scenario: Glancing at or above hit rejected

- **WHEN** `tiers: { hit: 1, glancing: 1 }` is declared
- **THEN** the Zod validator returns an error — glancing must be < hit

#### Scenario: Hit of zero rejected

- **WHEN** `tiers: { hit: 0 }` is declared
- **THEN** the Zod validator returns an error — hit must be a positive integer

---

### Requirement: Ritus Zod validator

`@eldritchforgeworks/dtk-types/ritus` SHALL export a `RitusSchema` Zod schema and a derived
`Ritus` TypeScript type via `z.infer`. Calling `RitusSchema.parse(value)` SHALL
throw a `ZodError` on invalid input and return a typed `Ritus` on valid input.
`RitusSchema.safeParse(value)` SHALL return a discriminated union result.

The schema is intentionally lean — it carries no roll procedures, no pool
formulas, and no consequence logic. Those belong in `kind: rule` Exemplars.

#### Scenario: Valid Ritus parses cleanly

- **WHEN** `RitusSchema.parse({ id: "sr5e", name: "Shadowrun 5e", mechanic: "pool-count", threshold: 5, tiers: { critical: 4, hit: 1, glancing: 0 } })` is called
- **THEN** it returns the object typed as `Ritus` with no error

#### Scenario: Invalid Ritus throws ZodError

- **WHEN** `RitusSchema.parse({ id: "sr5e" })` is called with missing required fields
- **THEN** it throws a `ZodError` identifying each missing path

---

### Requirement: Ritus type guard

`@eldritchforgeworks/dtk-types/ritus` SHALL export an `isRitus(value: unknown): value is Ritus`
type guard backed by `RitusSchema.safeParse`. No error is thrown for invalid input.

#### Scenario: Guard returns true for valid Ritus

- **WHEN** `isRitus(validRitus)` is called
- **THEN** it returns `true` and TypeScript narrows the type to `Ritus`

#### Scenario: Guard returns false for non-Ritus

- **WHEN** `isRitus({ foo: "bar" })` is called
- **THEN** it returns `false` without throwing

