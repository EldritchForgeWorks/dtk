## Why

Requested by: DTK Officina change init-m0-delivery-skeleton (M0).

Officina imports the `@dtk/types` Zod schemas for contract validation (constitution: never redefine DTK schemas), and every generated GM project repo must run `promptuarium validate` in CI with **zero credentials**. Both packages are currently unpublishable and unfetchable:

- `packages/types/package.json` and `packages/promptuarium/package.json` both declare `"private": true`.
- `packages/types/.npmrc` pins the scope to GitHub Packages (`@dtk:registry=https://npm.pkg.github.com`). GitHub Packages requires an auth token even for public reads, which would force a secret into every generated GM repo's CI — rejected.

Publishing both packages to the **public npm registry** removes the credential requirement entirely.

## What Changes

Module/package: `@dtk/types` (shared kernel, FREE tier) and `@dtk/promptuarium` (CLI for dtk-promptuarium, FREE tier). Contracts affected: Ritus, Codex, Forma, Modus, Exemplar — all defined in `@dtk/types`; `@dtk/promptuarium` consumes Exemplar and Modus.

- **`@dtk/types`**: remove `"private": true`; add `./sequence` and `./codex-entry` subpaths to the `exports` map — both exist in `dist/` and are re-exported by the root barrel (`src/index.ts`) but are missing from `exports`, so deep imports currently fail under Node resolution; remove or override the `.npmrc` GitHub-Packages scope pin (`@dtk:registry=https://npm.pkg.github.com`) so publish targets `registry.npmjs.org`.
- **`@dtk/promptuarium`**: remove `"private": true`; add a `files` allowlist and an `exports` map — the package currently has only a `bin` entry (`./dist/cli/index.js`), no `files`, no `main`/`exports`; resolve the `@dtk/types` `file:../../packages/types` devDependency for publish (bundle via the existing Vite build, or promote to a regular semver dependency on the published `@dtk/types`).
- **Versioning/publish procedure**: manual `npm publish --access public` from each package directory is acceptable for v1; document the order (types first, then promptuarium) and version-bump rules. A GitHub Actions publish workflow is optional follow-up, not a blocker.
- Update the `openspec/config.yaml` context line "npm package convention: @dtk/{name} (scoped, private registry)" to reflect the public registry.

## Non-goals

- No changes to any schema, type, or CLI behaviour — packaging and distribution only.
- No automated release pipeline required for v1 (may be added later).
- No publishing of any other package (`dtk-alea` etc. are Foundry modules, not npm packages — see change `module-release-automation`).

## Capabilities

### New Capabilities

- `package-publishing`: requirements for public-registry availability, credential-free install, and subpath export resolution of `@dtk/types` and `@dtk/promptuarium`.

### Modified Capabilities

*(none — no existing spec-level requirements change)*

## Impact

- `packages/types/package.json` — remove `private`, extend `exports`.
- `packages/types/.npmrc` — remove or override the GitHub Packages scope pin.
- `packages/promptuarium/package.json` — remove `private`, add `files`/`exports`, fix `@dtk/types` dependency form.
- `openspec/config.yaml` — context wording update (private → public registry).
- **Downstream**: Officina and generated GM repos can `npm install @dtk/types @dtk/promptuarium` with no `.npmrc` and no token; the M0 blocker (U2) clears.
