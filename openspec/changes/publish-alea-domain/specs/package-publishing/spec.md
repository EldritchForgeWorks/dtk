## ADDED Requirements

### Requirement: Public registry availability for @eldritchforgeworks/dtk-alea

`@eldritchforgeworks/dtk-alea` SHALL be published to the public npm registry (`registry.npmjs.org`) and SHALL be installable in a clean environment with no `.npmrc`, no auth token, and no registry override — same guarantee `publish-npm-packages` established for `@eldritchforgeworks/dtk-types` and `@eldritchforgeworks/dtk-promptuarium`.

#### Scenario: Clean install of @eldritchforgeworks/dtk-alea

- **WHEN** `npm install @eldritchforgeworks/dtk-alea` runs in a project with
  no `.npmrc` and no credentials
- **THEN** the install succeeds from registry.npmjs.org

---

### Requirement: Domain-only export surface

The published `@eldritchforgeworks/dtk-alea` package SHALL expose only `src/domain/**`, `src/ports/**`, `src/adapters/in-memory/**`, and the Foundry-free `AleaApi` facade (`createAleaApi`) via its `exports` map, each with `import` and `types` conditions and a shipped `.d.ts`. The package SHALL NOT expose, bundle, or otherwise make reachable any file under `src/adapters/foundry/**` or the Foundry module entry point (`src/index.ts`).

#### Scenario: Domain subpath resolves

- **WHEN** a consumer imports from `@eldritchforgeworks/dtk-alea/domain`
- **THEN** Node ESM resolution succeeds and TypeScript finds the
  declaration file, and `SequenceExecutor`, `ExpressionParser`,
  `RollResolver`, `TierResolver`, and `SequenceExecution` are all available

#### Scenario: Ports subpath resolves

- **WHEN** a consumer imports from `@eldritchforgeworks/dtk-alea/ports`
- **THEN** Node ESM resolution succeeds and all five port interfaces
  (`IActorRepository`, `ICombatStateStore`, `IDiceRoller`,
  `IExpressionDelegate`, `IHookEmitter`) are available as types

#### Scenario: In-memory adapters subpath resolves

- **WHEN** a consumer imports from
  `@eldritchforgeworks/dtk-alea/adapters/in-memory`
- **THEN** Node ESM resolution succeeds and all five in-memory test doubles
  are available

#### Scenario: Foundry adapters are unreachable

- **WHEN** the published tarball (`npm pack`) is inspected, or a consumer
  attempts to resolve any path under `@eldritchforgeworks/dtk-alea`
  reaching `adapters/foundry`
- **THEN** no such file exists in the tarball and no `exports` entry
  resolves to it

---

### Requirement: Foundry module build unaffected

The existing Vite build of the Foundry module (`vite build` → `dist/dtk-alea.js`, entry `src/index.ts`) SHALL continue to function unchanged after this change — the npm package build is an additional, independent build target, not a replacement.

#### Scenario: Foundry module build still succeeds

- **WHEN** `vite build` runs in `packages/alea`
- **THEN** `dist/dtk-alea.js` is produced exactly as before, and the
  Foundry module's existing test suite continues to pass

---

### Requirement: Node-clean smoke test of the published surface

A smoke test SHALL exist that imports `SequenceExecutor` and the in-memory port adapters from the published package surface in a plain Node.js script (no Foundry globals defined), composes them, replays a fixture sequence, and asserts on the emitted step/await/complete events — proving the domain-only surface is genuinely free of transitive Foundry imports.

#### Scenario: Fixture sequence replays outside Foundry

- **WHEN** a plain Node script imports `SequenceExecutor` +
  `DeterministicDiceRoller` + `InMemoryCombatStateStore` +
  `SpyHookEmitter` + `NullExpressionDelegate` from
  `@eldritchforgeworks/dtk-alea`, composes them with no Foundry globals
  defined, and executes a fixture `dtk.sequence` exemplar
- **THEN** the script runs to completion with no `ReferenceError` (e.g. `game
  is not defined`) and the expected `dtk-alea.step`/`dtk-alea.complete`
  events are observed via the spy hook emitter
