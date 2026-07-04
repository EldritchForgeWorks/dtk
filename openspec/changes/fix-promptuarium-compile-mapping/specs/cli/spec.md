## MODIFIED Requirements

### Requirement: promptuarium compile subcommand

`promptuarium compile` SHALL run the full build pipeline: read YAML Exemplars →
validate → (optionally describe) → compile → write LevelDB packs. It SHALL derive
the output mappers passed to the compiler from the `outputs` section of
`promptuarium.config.yaml` — an array of `{packId, documentType, kinds, fieldMap}`
entries, structurally identical to `ModusOutputMapper` — parsed and validated by
the CLI config loader. When the config declares a `sequences` source
(`{dir, packId}`), compile SHALL also validate each `MechanicSequenceExemplar`
document in that directory and write it to a `dtk.sequence` pack. It SHALL exit
with code `0` on success and code `1` on validation failure, printing all errors
to stderr. Compile SHALL exit `1` with a diagnostic — never a silent zero-pack
success — when the configuration yields zero pack outputs (missing or empty
`outputs` and no `sequences` source), or when any `outputs` entry or sequence
document is malformed.

#### Scenario: Compile exits 0 on success

- **WHEN** all Exemplars are valid and the config declares at least one `outputs` entry
- **THEN** the process exits with code `0` and a LevelDB pack is written for each `outputs` entry

#### Scenario: Compile exits 1 on validation error

- **WHEN** any Exemplar fails schema or cross-reference validation
- **THEN** all errors are printed to stderr and the process exits with code `1`

#### Scenario: Compile with no configured outputs fails

- **WHEN** `promptuarium compile` runs with a missing or empty `outputs` section and no `sequences` source configured
- **THEN** stderr explains that at least one pack output is required for compile and the process exits with code `1` without writing packs

#### Scenario: Malformed outputs entry fails

- **WHEN** an `outputs` entry is missing `packId`, `documentType`, `kinds`, or `fieldMap`, or a field has the wrong type
- **THEN** stderr identifies the offending entry and field and the process exits with code `1` without writing packs

#### Scenario: Sequence sources compiled

- **WHEN** the config declares `sequences: {dir, packId}` and the directory contains valid `MechanicSequenceExemplar` documents
- **THEN** a pack is written at `packId` containing one `dtk.sequence` item per document

#### Scenario: Invalid sequence document fails

- **WHEN** any document in the configured sequences directory fails `MechanicSequenceExemplarSchema` validation
- **THEN** stderr reports the file and validation errors and the process exits with code `1` without writing packs
