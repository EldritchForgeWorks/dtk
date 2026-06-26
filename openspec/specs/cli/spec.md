# cli Specification

## Purpose
TBD - created by archiving change dtk-promptuarium. Update Purpose after archive.
## Requirements
### Requirement: promptuarium.config.yaml project config

The CLI SHALL read `promptuarium.config.yaml` from the working directory (or from the
path specified by `--config`). The config SHALL declare:
- `exemplarsDir` — path to the directory containing YAML Exemplar files (default: `./exemplars`)
- `codexFile` — optional path to compiled Codex JSON for slug resolution
- `outputDir` — path where LevelDB pack files are written (default: `./packs`)
- `modus` — path to the Modus YAML file (for outputMapper and pack declarations)
- `llm` — optional LLM provider config (`provider`, `apiKey`, `model`)

#### Scenario: Config file loaded from working directory

- **WHEN** `promptuarium compile` is run in a directory with `promptuarium.config.yaml`
- **THEN** config values are loaded without requiring CLI flags

#### Scenario: Missing config file uses defaults

- **WHEN** no `promptuarium.config.yaml` exists
- **THEN** the CLI uses default paths (`./exemplars`, `./packs`) and proceeds

---

### Requirement: promptuarium compile subcommand

`promptuarium compile` SHALL run the full build pipeline: read YAML Exemplars →
validate → (optionally describe) → compile → write LevelDB packs. It SHALL exit with
code `0` on success and code `1` on validation failure, printing all errors to stderr.

#### Scenario: Compile exits 0 on success

- **WHEN** all Exemplars are valid and compilation completes
- **THEN** the process exits with code `0` and LevelDB packs are written

#### Scenario: Compile exits 1 on validation error

- **WHEN** any Exemplar fails schema or cross-reference validation
- **THEN** all errors are printed to stderr and the process exits with code `1`

---

### Requirement: promptuarium validate subcommand

`promptuarium validate` SHALL run corpus validation only — no compile, no LevelDB
write. Output is a structured report of errors (or "All valid" on success). Exits `0`
on valid, `1` on errors. Supports `--json` flag for machine-readable output.

#### Scenario: Validate reports all errors with --json

- **WHEN** `promptuarium validate --json` is run with two invalid Exemplars
- **THEN** stderr contains JSON matching `{ errors: [...], valid: false }` and exits `1`

#### Scenario: Validate exits 0 on clean corpus

- **WHEN** all Exemplars pass validation
- **THEN** output reads "All valid" (or `{"valid": true, "errors": []}` with `--json`) and exits `0`

---

### Requirement: promptuarium describe subcommand

`promptuarium describe` SHALL run NL generation for rule/sequence/action Exemplars
that lack descriptions and write results back to source YAML. Supports `--force`
(overwrite existing) and `--llm` (enable LLM polish). Does not compile or write LevelDB.

#### Scenario: describe generates missing descriptions

- **WHEN** `promptuarium describe` is run on a corpus with undescribed rule Exemplars
- **THEN** descriptions are generated and written back to the source YAML files

#### Scenario: describe --llm calls LLM provider

- **WHEN** `promptuarium describe --llm` is run with a valid LLM config
- **THEN** `ILLMClient.polish()` is called for each generated description

---

### Requirement: No Foundry globals in CLI path

The CLI entry point and all code it imports SHALL NOT reference `game`, `ui`, `Hooks`,
`CONFIG`, `Roll`, or any other Foundry global. The CLI SHALL run cleanly in a plain
Node.js environment with no Foundry instance.

#### Scenario: CLI runs in Node.js without Foundry

- **WHEN** `promptuarium validate` is run in a terminal without a Foundry server
- **THEN** it completes without error and no `ReferenceError` for Foundry globals is thrown

