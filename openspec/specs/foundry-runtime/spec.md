# foundry-runtime Specification

## Purpose
TBD - created by archiving change dtk-promptuarium. Update Purpose after archive.
## Requirements
### Requirement: PromptariumApi.validate() via game.dtk

The Foundry module SHALL register with `game.dtk` on `init` and expose a
`PromptariumApi` implementing the interface from `@dtk/types/apis`:
- `validate(value: unknown): ValidationResult` — runs `ExemplarSchema.safeParse()`
  and returns `{ valid: boolean, errors: ValidationError[] }`
- `isReady: boolean`

#### Scenario: validate returns valid for schema-valid Exemplar

- **WHEN** `game.dtk.api<PromptariumApi>('dtk-promptuarium')?.validate(validExemplar)` is called
- **THEN** `{ valid: true, errors: [] }` is returned

#### Scenario: validate returns errors for invalid Exemplar

- **WHEN** `validate({ kind: "rule" })` is called with a rule Exemplar missing required fields
- **THEN** `{ valid: false, errors: [{ field: "pool", ... }, ...] }` is returned

#### Scenario: validate never throws

- **WHEN** `validate(null)` or `validate(42)` is called
- **THEN** it returns `{ valid: false, errors: [...] }` without throwing

---

### Requirement: dtk-promptuarium.ready hook

After `game.dtk.register()` completes on `init`, the module SHALL fire
`Hooks.callAll('dtk-promptuarium.ready')`.

#### Scenario: dtk-promptuarium.ready fires on init

- **WHEN** dtk-promptuarium's `init` hook handler completes
- **THEN** `Hooks.callAll('dtk-promptuarium.ready')` is emitted

---

### Requirement: Foundry module has no Node.js-only imports

The Foundry module (`module/src/`) SHALL NOT import from the CLI package
(`packages/promptuarium/`). It uses `ExemplarSchema` directly from `@dtk/types/exemplar`.
No `fs`, `path`, `level`, or other Node.js built-in modules are imported.

#### Scenario: Foundry module loads without Node.js errors in browser context

- **WHEN** dtk-promptuarium Foundry module is loaded in a Foundry v12 browser context
- **THEN** no `require` or Node.js module errors occur

