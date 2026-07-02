## MODIFIED Requirements

### Requirement: promptuarium compile subcommand

`promptuarium compile` SHALL run the full build pipeline: read YAML Exemplars →
validate → (optionally describe) → compile → write LevelDB packs. It SHALL load the
Modus declared by the `modus` config key, validate it against the `@dtk/types` Modus
schema, and derive the output mappers passed to the compiler from the Modus
compendium declarations. It SHALL exit with code `0` on success and code `1` on
validation failure, printing all errors to stderr. Compile SHALL exit `1` with a
diagnostic — never a silent success — when no Modus is configured, the Modus fails
to load or validate, or the Modus yields zero output mappers.

#### Scenario: Compile exits 0 on success

- **WHEN** all Exemplars are valid, the configured Modus loads, and compilation completes
- **THEN** the process exits with code `0` and LevelDB packs are written for each Modus compendium declaration

#### Scenario: Compile exits 1 on validation error

- **WHEN** any Exemplar fails schema or cross-reference validation
- **THEN** all errors are printed to stderr and the process exits with code `1`

#### Scenario: Compile without a configured Modus fails

- **WHEN** `promptuarium compile` runs with no `modus` key in config
- **THEN** stderr explains that a Modus is required for compile and the process exits with code `1`

#### Scenario: Modus yielding zero mappers fails

- **WHEN** the configured Modus is valid but declares no compendium output mappers
- **THEN** stderr reports zero output mappers and the process exits with code `1` without writing packs
