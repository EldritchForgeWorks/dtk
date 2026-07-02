## ADDED Requirements

### Requirement: defineSystem exercised by an in-repo consumer

The `defineSystem` path SHALL be exercised by at least one real consumer inside this
repository: `dtk-shadowrun` SHALL register its actor types and sheets exclusively via
`defineSystem(modus)` (no direct `CONFIG.Actor.dataModels` or `Actors.registerSheet`
calls in system code), and a domain-level smoke test SHALL run a full realistic Modus
through `SystemRegistrar.build` on every test run.

#### Scenario: Reference consumer uses defineSystem only

- **WHEN** `packages/shadowrun/src/` is searched for `CONFIG.Actor.dataModels` and `Actors.registerSheet`
- **THEN** no matches exist — registration goes through `defineSystem(modus)`

#### Scenario: Full-Modus smoke test passes

- **WHEN** the systema test suite runs the shadowrun-shaped Modus through `SystemRegistrar.build`
- **THEN** the resulting descriptor contains the declared actor data model and sheet registration with no errors

#### Scenario: Converted consumer behaves identically in Foundry

- **WHEN** a `shadowrunCharacter` actor is created after the defineSystem conversion (manual smoke)
- **THEN** the data model and default sheet match the pre-conversion behaviour
