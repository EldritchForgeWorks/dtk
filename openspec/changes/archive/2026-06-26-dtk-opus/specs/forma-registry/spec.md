# Spec: forma-registry

The Forma registry stores registered Forma schemas per game system. A Forma schema
declares the steps and advancement tracks that drive the creation wizard and advancement
tracker.

## ADDED Requirements

### Requirement: Forma registration via OpusApi

`OpusApi.registerForma(systemId: string, forma: Forma)` SHALL validate the provided
Forma via `FormaSchema` from `@dtk/types/forma` and store it keyed by `systemId`. A
duplicate registration (same systemId) overwrites the prior entry and logs a console
warning. An invalid Forma (fails schema validation) SHALL throw a descriptive error.

#### Scenario: Valid Forma stored by system id

- **WHEN** `OpusApi.registerForma("sr5e", validForma)` is called
- **THEN** `FormaRegistry.get("sr5e")` returns the registered Forma

#### Scenario: Duplicate registration warns and overwrites

- **WHEN** `OpusApi.registerForma("sr5e", formaA)` then `OpusApi.registerForma("sr5e", formaB)` are called
- **THEN** a console warning is logged and only `formaB` is stored for `"sr5e"`

#### Scenario: Invalid Forma throws descriptive error

- **WHEN** `OpusApi.registerForma("sr5e", { steps: null })` is called with invalid data
- **THEN** a descriptive error is thrown identifying the failing fields

---

### Requirement: Forma step validation

Each step in `forma.steps[]` SHALL have a unique `id` within the Forma. Steps with
duplicate ids SHALL cause the schema validation to fail with a descriptive error
identifying the duplicate.

#### Scenario: Steps with unique ids pass validation

- **WHEN** a Forma has steps with ids `["metatype", "archetype", "attributes"]`
- **THEN** validation passes without error

#### Scenario: Steps with duplicate ids fail validation

- **WHEN** a Forma has two steps both with `id: "metatype"`
- **THEN** schema validation fails with a message identifying the duplicate step id

---

### Requirement: Forma advancement track validation

The validator SHALL check that any `unlocks_after` step id in an advancement track entry exists in `steps[]`. Advancement tracks reference step ids from the same Forma's `steps[]`; missing step id references SHALL produce a validation error.

#### Scenario: Valid step id reference in advancement track passes

- **WHEN** an advancement track entry declares `unlocks_after: "archetype"` and `"archetype"` is a step id
- **THEN** validation passes

#### Scenario: Unknown step id reference in advancement track fails

- **WHEN** an advancement track entry declares `unlocks_after: "ghost-step"` and no such step exists
- **THEN** validation fails with a message identifying the missing step reference

---

### Requirement: FormaRegistry.get() — retrieve or null

`FormaRegistry.get(systemId: string): Forma | null` SHALL return the registered Forma
for the given system, or `null` if none has been registered.

#### Scenario: Registered Forma returned by system id

- **WHEN** `"sr5e"` Forma was registered
- **THEN** `FormaRegistry.get("sr5e")` returns the Forma

#### Scenario: Unregistered system returns null

- **WHEN** `FormaRegistry.get("unknown-system")` is called
- **THEN** `null` is returned without throwing
