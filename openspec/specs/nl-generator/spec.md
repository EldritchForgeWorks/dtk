# nl-generator Specification

## Purpose
TBD - created by archiving change dtk-promptuarium. Update Purpose after archive.
## Requirements
### Requirement: Template-based description generation

The generator SHALL produce descriptions for rule/sequence/action Exemplars using
Handlebars templates. Templates are bundled with the CLI — one per kind. Templates
receive the Exemplar's fields as the Handlebars context. Generated text is set as the
Exemplar's `description` field; if `description` is already present, the generator
skips that Exemplar (no overwrite) unless `--force` is passed.

#### Scenario: Missing description is generated

- **WHEN** a `kind: rule` Exemplar has no `description` field
- **THEN** the generator produces a description from the rule template and populates the field

#### Scenario: Existing description is not overwritten

- **WHEN** a `kind: rule` Exemplar already has a `description` field
- **THEN** the generator skips it; the existing description is unchanged

#### Scenario: Existing description overwritten with --force

- **WHEN** `--force` is passed and a `kind: rule` Exemplar has a description
- **THEN** the generator overwrites the description with freshly generated text

---

### Requirement: Codex slug resolution in templates

Templates SHALL resolve Codex slugs via a `{{resolve slug}}` Handlebars helper that calls `ICodexProvider.resolveSlug(slug)` and returns the display name. If the slug is
not found in the Codex, the slug itself is returned unchanged.

#### Scenario: Known slug resolves to display name

- **WHEN** the Codex maps `"agility"` → `"Agility"` and the template uses `{{resolve "agility"}}`
- **THEN** the rendered output contains `"Agility"`

#### Scenario: Unknown slug falls back to slug value

- **WHEN** `"arcane-power"` is not in the Codex and `{{resolve "arcane-power"}}` is called
- **THEN** the rendered output contains `"arcane-power"` unchanged

---

### Requirement: LLM polish pass — optional, cached

When `--llm` is passed to `promptuarium describe`, the generator SHALL:
1. Generate the template-based description
2. Call `ILLMClient.polish(templateText, exemplarName)` to produce polished prose
3. Cache the result in `.promptuarium-cache.json` keyed by `{ exemplarId, contentHash }`
4. Write the polished text as the `description` field

On subsequent runs, if the Exemplar content has not changed (same content hash), the
cached polished description is used without calling the LLM.

#### Scenario: LLM polish called on first run

- **WHEN** `--llm` is passed and no cache entry exists for the Exemplar
- **THEN** `ILLMClient.polish()` is called; result is cached and written

#### Scenario: Cached result reused on unchanged Exemplar

- **WHEN** `--llm` is passed and a valid cache entry exists with matching content hash
- **THEN** `ILLMClient.polish()` is NOT called; cached text is used directly

#### Scenario: Cache invalidated when Exemplar content changes

- **WHEN** the Exemplar's `pool` field changes and a cache entry exists
- **THEN** content hash differs; `ILLMClient.polish()` is called; cache is updated

---

### Requirement: Generated descriptions written back to source YAML

After generation (template or LLM), the generator SHALL write the `description`
field back into the source YAML file in place. The YAML structure is preserved;
only the `description` field is added or updated.

#### Scenario: Source YAML updated with generated description

- **WHEN** `promptuarium describe` runs on a rule YAML without a description
- **THEN** the YAML file on disk is updated to include the generated `description`

#### Scenario: Other YAML fields unchanged after write-back

- **WHEN** `promptuarium describe` updates the `description` field
- **THEN** all other fields in the YAML file remain byte-identical to the original

