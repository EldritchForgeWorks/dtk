## Why

Requested by: DTK Officina change `m2-sequence-builder` (task 0.1, upstream ask
U-M2-1).

Officina's M2 (`dry-run-preview`) needs to execute real sequences at
authoring time — a designer previews a `dtk.sequence` Exemplar and sees the
same tier resolution, hit math, and event stream the sequence will produce in
live Foundry play. Per both repos' constitutions (reuse before
reimplementation; DTK's own hexagonal-architecture standard exists precisely
so domain logic is portable), Officina should compose dtk-alea's actual
`SequenceExecutor` + `ExpressionParser` + `RollResolver` + `TierResolver` +
`SequenceExecution` with the existing in-memory ports — not fork or
reimplement the pipeline in TypeScript a second time. A reimplementation
would drift from live-play semantics silently (the exact failure mode
`ritus-tier-vocabulary` documented for the tiers vocabulary).

Today `dtk-alea` (`packages/alea/`) cannot be consumed this way:

- `packages/alea/package.json` declares `"private": true` (same pattern as
  every other DTK package pre-`publish-npm-packages`/`ritus-tier-vocabulary`).
- The package has no `exports` map, no `.d.ts` output, and no dependency
  metadata (`repository`, `homepage`, `engines`, `license`,
  `publishConfig`) — it has never been built for consumption outside its own
  Foundry module bundle.
- The only existing build is `vite build` → a single-file ES bundle
  (`dist/dtk-alea.js`) whose entry point, `src/index.ts`, calls `Hooks.on`
  and reads `game.dtk` at module scope — it throws immediately if evaluated
  outside a live Foundry environment. `src/adapters/foundry/*.ts` (10 files:
  `FoundryDiceRoller`, `FoundryCombatStateStore`, `FoundryHookEmitter`,
  `LexExpressionDelegate`, `FoundryActorRepository`, `CompendiumScanner`,
  `RitusDataModel`, `RitusSheet`, `SequenceDataModel`, `SequenceSheet`) all
  declare Foundry globals (`declare const game: any`, `Hooks`, `CONFIG`,
  `Items`) at the top and are unusable — and unsafe to even import — outside
  Foundry.
- `src/domain/`, `src/ports/`, and `src/adapters/in-memory/` are, by the
  repo's own architectural rule (`openspec/config.yaml`: "domain/ and ports/
  have zero imports from foundry/ or game/* globals"), already
  Foundry-free and independently unit-tested (verified: `grep -rn "declare
  const\|game\.\|Hooks\.\|canvas\." src/domain src/ports
  src/adapters/in-memory` returns no matches). This is exactly the surface
  Officina needs, and exactly the surface that is safe to publish.

## What Changes

Module: `dtk-alea` (`packages/alea/`, FREE tier). npm package:
`@eldritchforgeworks/dtk-alea` (new — first-ever npm publish of this
package; it has only ever shipped as a Foundry module release).

- **Un-private the package**: remove `"private": true` from
  `packages/alea/package.json`.
- **Add package metadata** matching the `@eldritchforgeworks/dtk-types` /
  `@eldritchforgeworks/dtk-promptuarium` precedent set in
  `publish-npm-packages`: `engines.node >= 20`, `license: MIT`,
  `repository`/`homepage` pointing at `github.com/EldritchForgeWorks/dtk`
  (directory `packages/alea`), `publishConfig: { access: public, registry:
  https://registry.npmjs.org/ }`, `files: ["dist"]`.
- **Add a second, parallel build target** — a plain `tsc` project build,
  alongside (not replacing) the existing Vite module build. The existing
  `vite build` → `dist/dtk-alea.js` (the Foundry module bundle,
  `src/index.ts` entry, unchanged) continues to ship the Foundry module
  exactly as today. A new `tsconfig.build.json` (mirroring
  `packages/types/tsconfig.build.json`: extends the base `tsconfig.json`,
  sets `rootDir: ./src`, `declaration: true`) compiles `src/domain/**`,
  `src/ports/**`, `src/adapters/in-memory/**`, and `src/AleaApi.ts` to
  `dist/**/*.js` + `.d.ts` — **excluding `src/index.ts` and all of
  `src/adapters/foundry/**`** from its `include`. `package.json`'s `build`
  script becomes `vite build && tsc --project tsconfig.build.json` (same
  chaining pattern `publish-npm-packages` used for
  `dtk-promptuarium`'s dual Vite configs).
- **`exports` map** covering the subpaths Officina needs, `types` + `import`
  conditions, mirroring the `@eldritchforgeworks/dtk-types` precedent:
  - `.` → `AleaApi` (the Foundry-free facade factory `createAleaApi`, which
    takes ports as constructor arguments — already zero-Foundry today) plus
    the domain/port barrel re-exports Officina actually needs
  - `./domain` → entities (`SequenceExecution`, `RollContext`) + services
    (`SequenceExecutor`, `ExpressionParser`, `RollResolver`, `TierResolver`,
    `RitusRegistry`, `SequenceExemplarRegistry`) + value-objects
    (`RitusConfig`, `RollResult`, `StepOutput`)
  - `./ports` → the five port interfaces (`IActorRepository`,
    `ICombatStateStore`, `IDiceRoller`, `IExpressionDelegate`,
    `IHookEmitter`)
  - `./adapters/in-memory` → the five test-double adapters
    (`DeterministicDiceRoller`, `InMemoryActorRepository`,
    `InMemoryCombatStateStore`, `NullExpressionDelegate`, `SpyHookEmitter`)
  - **`src/adapters/foundry/**` is never exported and never emitted to
    `dist/` by the tsc build** — this is the load-bearing exclusion. If
    Officina's bundler or Node resolution ever reached a
    `src/adapters/foundry/*` module outside a Foundry runtime, evaluating it
    would throw on the first `declare const game`/`Hooks` reference at
    runtime (they are typed as `any` but read as real globals at module
    top-level in some adapters) — this must be structurally impossible, not
    just discouraged.
- **Version**: publish as `@eldritchforgeworks/dtk-alea@0.1.0` (module's
  current `module.json`/`package.json` version; first npm release).
- **`.npmrc`**: add the same `@eldritchforgeworks:registry=registry.npmjs.org`
  scope pin used by `packages/types/.npmrc`, since `packages/alea` has none
  today (it has never needed one — pin guards against a user-level
  `~/.npmrc` redirecting the scope to GitHub Packages).

## Non-goals

- No change to the Foundry module build, `dist/dtk-alea.js`, `module.json`,
  or the module's GitHub-release distribution path — that remains exactly
  as `module-release-automation` (a separate, in-flight change) will wire it
  up. This change adds a parallel npm artifact; it does not touch the
  existing one.
- `src/adapters/foundry/**` is never published, exported, or otherwise made
  reachable from the npm package — no Foundry adapter, sheet, or data model
  ships in the `@eldritchforgeworks/dtk-alea` tarball.
- No change to any domain behavior, port interface, or in-memory adapter
  logic — packaging and distribution only, same scope discipline as
  `publish-npm-packages`.
- No change to `@eldritchforgeworks/dtk-types` or `@eldritchforgeworks/dtk-promptuarium`.
- Actually running `npm publish` is out of scope for this change's
  implementation — the tasks below stop at "ready to publish, pending
  principal's npm auth," matching how `publish-npm-packages` handed off its
  3.1/3.2 tasks.
- This explicitly supersedes the narrower non-goal stated in
  `publish-npm-packages` ("no publishing of any other package (`dtk-alea`
  etc. are Foundry modules, not npm packages...)") for `dtk-alea`
  specifically, now that a concrete downstream consumer (Officina M2) needs
  its domain layer. That non-goal still holds for every other Foundry-only
  module not covered here.

## Capabilities

### Modified Capabilities

- `package-publishing`: extends the capability introduced by
  `publish-npm-packages` (public-registry availability, credential-free
  install, subpath export resolution) with a new requirement class:
  publishing a package that is a **partial** surface of a larger source
  tree (domain + ports + in-memory adapters only), with a structural
  guarantee that the excluded Foundry-adapter surface is unreachable from
  the published artifact.

## Impact

- `packages/alea/package.json` — remove `private`, add metadata
  (`engines`, `license`, `repository`, `homepage`, `publishConfig`,
  `files`, `exports`), extend `build` script.
- `packages/alea/tsconfig.build.json` — new file (tsc build project,
  excludes `src/index.ts` + `src/adapters/foundry/**`).
- `packages/alea/.npmrc` — new file, scope pin to `registry.npmjs.org`.
- **Downstream**: Officina's `dry-run-preview` (M2) can
  `npm install @eldritchforgeworks/dtk-alea` and compose
  `SequenceExecutor` + in-memory ports directly, with no Foundry runtime
  and no reimplementation of sequence-execution semantics. U-M2-1 clears.
