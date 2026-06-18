# Spec: forma

The Forma is the contract a game system authors to define its character creation and
advancement wizard. It is consumed exclusively by dtk-opus. The Forma is entirely
declarative data — no plugin code runs inside the wizard engine.

## ADDED Requirements

### Requirement: Forma identity and presentation

A Forma SHALL carry: `id` (non-empty string, matching the system ID), `name`
(localizable string), and optionally `tagline`, `description`, and `theme`
(visual theme string, default `"default"`).

#### Scenario: Minimal Forma accepted

- **WHEN** a Forma declares only `id` and `name`
- **THEN** the validator accepts it

#### Scenario: Missing id rejected

- **WHEN** a Forma omits `id`
- **THEN** the Zod validator returns an error

---

### Requirement: Creation steps

A Forma SHALL declare a `creationSteps` array of `WizardStep` objects.
At least one step is required for creation mode. Each step SHALL carry:
`id` (unique within the Forma), `label` (string), optionally `hint` (string),
optionally `condition` (a `Condition` predicate — see Condition requirement),
and `fields` (array of `WizardField` — see Field type requirement).

#### Scenario: Single step accepted

- **WHEN** `creationSteps` has one step with a valid id and at least one field
- **THEN** the validator accepts it

#### Scenario: Empty creationSteps rejected

- **WHEN** `creationSteps: []` is declared
- **THEN** the Zod validator returns an error

#### Scenario: Duplicate step id rejected

- **WHEN** two steps share the same `id`
- **THEN** the Zod validator returns an error citing the duplicate

---

### Requirement: Advancement steps

A Forma MAY declare an `advancementSteps` array of `WizardStep` objects for
level-up / advancement mode. If omitted, dtk-opus disables the advance mode for
this system. Steps follow the same shape as `creationSteps`.

#### Scenario: Advancement steps omitted

- **WHEN** no `advancementSteps` field is declared
- **THEN** the validator accepts it

---

### Requirement: Field type union

Each `WizardField` within a step SHALL have a `type` discriminator selecting one
of the supported field types: `text`, `number`, `select`, `allocation`,
`priority-matrix`, `derived`, `custom`. All field types share: `id` (string),
`label` (string), optionally `hint`, `condition`, and `required` (boolean, default false).

Additional per-type fields:
- `select`: `options` array (each with `value` and `label`), optional `multiple`
- `number`: `min`, `max`, `step` (all optional numbers)
- `allocation`: `pool` (string — a `$ref` to a budget value or a literal number),
  `targets` (array of slugs receiving allocated points)
- `priority-matrix`: `rows` and `columns` (arrays of labelled items)
- `derived`: `formula` (string — computed from current wizard state)
- `custom`: `renderer` (string key of a registered custom renderer)

#### Scenario: Text field accepted

- **WHEN** a field declares `type: "text"`, `id`, and `label`
- **THEN** the validator accepts it

#### Scenario: Select field missing options rejected

- **WHEN** a field declares `type: "select"` but no `options` array
- **THEN** the Zod validator returns an error

#### Scenario: Unknown type rejected

- **WHEN** a field declares `type: "slider"`
- **THEN** the Zod validator returns an error listing valid types

---

### Requirement: Condition predicate language

A `Condition` is a serialisable JSON predicate used for step/field visibility and
validation. The Forma schema SHALL define `Condition` as a recursive discriminated
union with the following node types:

- `{ op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte", field: string, value: unknown }`
  — compare a wizard field value
- `{ op: "and" | "or", conditions: Condition[] }` — logical composition
- `{ op: "not", condition: Condition }` — logical negation
- `{ op: "true" }` / `{ op: "false" }` — constants

No `eval`, no function references. All condition nodes are valid JSON.

#### Scenario: Simple eq condition accepted

- **WHEN** `condition: { op: "eq", field: "race", value: "elf" }` is declared
- **THEN** the validator accepts it

#### Scenario: Nested and/or condition accepted

- **WHEN** a condition nests `and` containing two `eq` nodes
- **THEN** the validator accepts it

#### Scenario: Unknown op rejected

- **WHEN** `condition: { op: "contains", field: "tags", value: "magic" }` is declared
- **THEN** the Zod validator returns an error

#### Scenario: Function reference rejected

- **WHEN** a condition value is a JavaScript function
- **THEN** the Zod validator returns an error — conditions are data only

---

### Requirement: Advancement paradigm configuration

A Forma SHALL declare an `advancement` object with a `paradigm` discriminator
controlling how dtk-opus gates character advancement. Six paradigms are supported:

```typescript
AdvancementConfigSchema = z.discriminatedUnion("paradigm", [
  z.object({ paradigm: z.literal("xp"),        currency: z.string().default("XP"),    starting: z.number().int().nonnegative().default(0) }),
  z.object({ paradigm: z.literal("milestone"),  per_milestone: z.number().int().positive().default(1) }),
  z.object({ paradigm: z.literal("resource"),   resource: z.string(), currency: z.string() }),
  z.object({ paradigm: z.literal("practice"),   check_at: z.enum(["session_end"]),    check_expression: z.string() }),
  z.object({ paradigm: z.literal("marks"),      marks_per_session: z.number().int().positive(), currency: z.string().default("Marks") }),
  z.object({ paradigm: z.literal("session"),    sessions_per_advance: z.number().int().positive().default(1) }),
])
```

#### Scenario: XP paradigm config valid

- **WHEN** `advancement: { paradigm: "xp", currency: "Karma", starting: 400 }` is declared
- **THEN** the validator accepts it

#### Scenario: Resource paradigm requires resource expression and currency

- **WHEN** `advancement: { paradigm: "resource" }` is declared (missing required fields)
- **THEN** the Zod validator returns an error

#### Scenario: Unknown paradigm rejected

- **WHEN** `advancement: { paradigm: "custom" }` is declared
- **THEN** the validator returns an error; discriminated union rejects the unknown variant

---

### Requirement: Advancement track entries

A Forma MAY declare an `advancementTracks` array of `AdvancementEntry` objects
representing purchasable abilities or improvements:

```typescript
AdvancementEntrySchema = z.object({
  id:            z.string().min(1).regex(/^[a-z0-9-]+$/),
  title:         z.string().min(1),
  description:   z.string().optional(),
  cost:          z.number().int().nonnegative(),
  requires:      z.string().optional(),   // prerequisite expression
  unlocks_after: z.string().optional(),   // step id that must be completed first
  exemplarRef:   z.string().optional(),   // Exemplar id to grant on purchase
})
```

A `.superRefine()` check SHALL verify that any `unlocks_after` step id exists in
`creationSteps[].id` or `advancementSteps[].id`.

#### Scenario: Minimal advancement entry valid

- **WHEN** `{ id: "agi-1", title: "Agility +1", cost: 10 }` is parsed
- **THEN** the validator accepts it

#### Scenario: Negative cost rejected

- **WHEN** `{ id: "agi-1", title: "Agility +1", cost: -5 }` is parsed
- **THEN** the validator returns an error on `cost`

#### Scenario: unlocks_after referencing unknown step id rejected

- **WHEN** a track entry has `unlocks_after: "ghost-step"` and no step with that id exists in the Forma
- **THEN** the validator returns an error via `.superRefine()`

---

### Requirement: Output mapper type

A Forma SHALL declare an `outputMapper` — a string key referencing a registered
output mapper function. The mapper transforms wizard state into the `system` data
object written to the Foundry Actor. The output mapper is NOT inlined in the Forma
(it is code, registered separately) — only the key is stored in the Forma data.

#### Scenario: Output mapper key accepted

- **WHEN** `outputMapper: "veilrunner.creation"` is declared
- **THEN** the validator accepts it

#### Scenario: Missing output mapper rejected

- **WHEN** `outputMapper` is omitted
- **THEN** the Zod validator returns an error

---

### Requirement: Forma Zod validator

`@dtk/types/forma` SHALL export a `FormaSchema` Zod schema and a derived `Forma`
TypeScript type. The `Condition` recursive type SHALL use `z.lazy()` at the
`and`/`or`/`not` recursion points to avoid infinite schema expansion.

#### Scenario: Valid Forma parses cleanly

- **WHEN** `FormaSchema.parse(validForma)` is called with a complete Forma
- **THEN** it returns the object typed as `Forma`

#### Scenario: Condition recursion does not cause stack overflow

- **WHEN** a Forma with a five-level-deep nested condition is parsed
- **THEN** the validator resolves correctly without error

---

### Requirement: Forma type guard

`@dtk/types/forma` SHALL export an `isForma(value: unknown): value is Forma`
type guard backed by `FormaSchema.safeParse`.

#### Scenario: Valid Forma narrows type

- **WHEN** `isForma(validForma)` is called
- **THEN** it returns `true`

#### Scenario: Non-Forma returns false without throwing

- **WHEN** `isForma(undefined)` is called
- **THEN** it returns `false`
