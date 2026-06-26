## Why

Game designers author Exemplars as YAML files — human-readable, version-controllable,
and free of TypeScript. Something must validate those files against the Exemplar
contract, resolve cross-references, compile them to Foundry LevelDB compendium packs,
and optionally generate natural-language descriptions from the DSL. dtk-promptuarium
is that build-time tool.

## What Changes

- Introduces `dtk-promptuarium` as a new Node.js CLI tool and (optionally) a thin
  Foundry module for runtime Exemplar validation, free tier, independent repo
- Provides `promptuarium compile` — validates YAML Exemplar corpus and writes LevelDB
  compendium packs consumable by Foundry as a game system's compendium
- Provides `promptuarium validate` — validates corpus without writing output; suitable
  for CI gating
- Provides `promptuarium describe` — generates `description` fields for `kind: rule`,
  `kind: sequence`, and `kind: action` Exemplars that lack them, using a template
  engine that maps DSL fields and Codex slugs to natural language; optional LLM
  polish pass with result cached back into the source YAML
- Provides `PromptariumApi.validate(exemplar)` as a Foundry runtime face for
  on-the-fly validation (used by dtk-systema when loading actor action lists)

## Capabilities

### New Capabilities

- `exemplar-compiler`: Reads YAML Exemplar files, validates each against
  `ExemplarSchema` from `@dtk/types`, builds the full corpus, cross-reference checks
  (parent ids exist, ref ids exist, slug uniqueness), and writes one LevelDB pack per
  compendium pack declared in the Modus.
- `corpus-validator`: Standalone validation pass (no write) — produces structured
  error output per-file with field paths. Suitable for CI. Used internally by the
  compiler before any write step.
- `nl-generator`: Generates `description` fields for rule/sequence/action Exemplars
  from their DSL fields. Uses Codex slug→display-name lookup for human-readable
  attribute/skill names. Template-based (Handlebars); optional LLM polish pass via
  configurable provider (OpenAI-compatible API); polish result written back into the
  source YAML and cached in a sidecar `.cache.json`.
- `cli`: The `promptuarium` CLI entry point. Subcommands: `compile`, `validate`,
  `describe`. Reads config from `promptuarium.config.yaml` in the project root.
  No Foundry globals — pure Node.js.
- `foundry-runtime`: Thin Foundry module face (`PromptariumApi.validate()`) for
  runtime schema validation of Exemplar data retrieved from compendium at runtime.
  Registered with `game.dtk` on `init`.

### Modified Capabilities

_(none — this change introduces only new capabilities)_

## Impact

- **New Node.js CLI + optional Foundry module**: `dtk-promptuarium`, independent repo, free tier
- **CLI package**: `@dtk/promptuarium` (private registry); installed as devDependency
  in game system repos
- **Depends on**: `@dtk/types` (Exemplar schema validation); optionally `dtk` hub
  (for Foundry-side `game.dtk.register()`)
- **Consumed by**: Every DTK game system build pipeline (compile YAML → LevelDB);
  dtk-systema at runtime (validate Exemplar data from compendium)
- **No Foundry globals in CLI**: `compile`, `validate`, and `describe` are pure
  Node.js — they never import from or reference `game`, `Hooks`, or `CONFIG`
- **LevelDB output format**: must match Foundry's compendium pack format exactly
  (`.db` files read by NeDB / ClassicLevel in Foundry v12+)
- **Codex dependency for NL generation**: `describe` requires a compiled Codex JSON
  file (output by the game system's Codex YAML) to resolve slug display names;
  without it, slugs are used as-is in generated descriptions
