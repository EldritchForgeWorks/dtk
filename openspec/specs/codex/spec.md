# codex Specification

## Purpose
TBD - created by archiving change dtk-types. Update Purpose after archive.
## Requirements
### Requirement: CodexEntry — rich per-slug metadata

A Codex SHALL be composed of `CodexEntry` objects, not bare slug strings. Each entry
provides the metadata dtk-lex needs for autocomplete, condition evaluation, and
dtk-promptuarium's `{{resolve slug}}` helper:

```typescript
CodexEntrySchema = z.object({
  slug:        z.string().min(1).regex(/^[a-z0-9-]+$/),
  displayName: z.string().min(1),
  description: z.string().optional(),
  condition:   z.string().optional(),  // boolean expression; makes entry a named condition
  category:    z.string().optional(),  // grouping hint, e.g. "attribute", "skill"
})
```

The top-level array fields (`attributes`, `skills`, `derived`, `damageTypes`,
`currencies`) contain `CodexEntry` objects, not strings. This lets dtk-lex and
dtk-promptuarium read display names without a secondary lookup.

#### Scenario: Entry with displayName and condition accepted

- **WHEN** `{ slug: "prone", displayName: "Prone", condition: "@actor.conditions.prone == true" }` is an element of `attributes`
- **THEN** the validator accepts it

#### Scenario: Entry missing displayName rejected

- **WHEN** an entry has `{ slug: "agility" }` with no `displayName`
- **THEN** the Zod validator returns an error on `displayName`

---

### Requirement: Codex identity

A Codex SHALL carry a `systemId` (non-empty string) matching the Foundry game system
ID it belongs to. This allows dtk-lex to associate a Codex with the active system.

#### Scenario: Valid identity accepted

- **WHEN** a Codex is defined with `systemId: "veilrunner"`
- **THEN** the Zod validator accepts it

#### Scenario: Missing systemId rejected

- **WHEN** a Codex omits `systemId`
- **THEN** the Zod validator returns an error

---

### Requirement: Attribute entries

A Codex SHALL declare an `attributes` array of `CodexEntry` objects. Each entry's
slug must be unique within the array. The array MAY be empty, but the field is required.
Cross-field slug uniqueness (no collision with `skills`, `derived`) is enforced via
`.superRefine()`.

#### Scenario: Attribute entry list accepted

- **WHEN** a Codex declares `attributes: [{ slug: "body", displayName: "Body" }, ...]`
- **THEN** the validator accepts it

#### Scenario: Duplicate attribute slug rejected

- **WHEN** two entries in `attributes` share the same `slug`
- **THEN** the Zod validator returns an error citing the duplicate

#### Scenario: Empty attributes array accepted

- **WHEN** a Codex declares `attributes: []`
- **THEN** the validator accepts it

---

### Requirement: Skill entries

A Codex SHALL declare a `skills` array of `CodexEntry` objects. Skill slugs SHALL NOT
duplicate attribute slugs within the same Codex.

#### Scenario: Skill entry list accepted

- **WHEN** a Codex declares `skills: [{ slug: "stealth", displayName: "Stealth" }]`
- **THEN** the validator accepts it

#### Scenario: Skill slug colliding with attribute rejected

- **WHEN** an attribute entry has `slug: "body"` and a skill entry also has `slug: "body"`
- **THEN** the Zod validator returns an error citing the collision

---

### Requirement: Derived stat entries

A Codex SHALL declare a `derived` array of `CodexEntry` objects for computed stats.
Derived slugs SHALL NOT duplicate attribute or skill slugs.

#### Scenario: Derived entry list accepted

- **WHEN** a Codex declares `derived: [{ slug: "defense", displayName: "Defense" }]` with no collisions
- **THEN** the validator accepts it

---

### Requirement: Damage type and currency entries

A Codex SHALL declare `damageTypes` and `currencies` arrays of `CodexEntry` objects.
Both MAY be empty.

#### Scenario: Damage type entries accepted

- **WHEN** `damageTypes: [{ slug: "physical", displayName: "Physical" }]` is declared
- **THEN** the validator accepts it

#### Scenario: Currency entries accepted

- **WHEN** `currencies: [{ slug: "karma", displayName: "Karma" }]` is declared
- **THEN** the validator accepts it

---

### Requirement: Codex Zod validator

`@dtk/types/codex` SHALL export a `CodexSchema` Zod schema and a derived
`Codex` TypeScript type. The schema SHALL enforce cross-field uniqueness rules
(no slug collision across attribute/skill/derived arrays) via Zod's `.superRefine()`.

#### Scenario: Valid Codex parses cleanly

- **WHEN** `CodexSchema.parse(validCodex)` is called with no slug collisions
- **THEN** it returns the object typed as `Codex`

#### Scenario: Cross-field collision caught at parse time

- **WHEN** `CodexSchema.parse(codexWithCollision)` is called
- **THEN** it throws a `ZodError` with a message identifying which slugs collide

---

### Requirement: Codex type guard

`@dtk/types/codex` SHALL export an `isCodex(value: unknown): value is Codex`
type guard backed by `CodexSchema.safeParse`.

#### Scenario: Guard returns true for valid Codex

- **WHEN** `isCodex(validCodex)` is called
- **THEN** it returns `true`

#### Scenario: Guard returns false for non-Codex

- **WHEN** `isCodex(null)` is called
- **THEN** it returns `false` without throwing

