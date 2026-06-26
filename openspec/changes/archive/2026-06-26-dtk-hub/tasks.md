## 0. Architecture Scaffold

> dtk-hub follows hexagonal architecture. Domain (version comparison, registry
> validation, module coordination) is pure TypeScript in `src/domain/`. All Foundry
> coupling is in `src/adapters/foundry/`. Tests inject in-memory stubs via ports.
> TDD: each `#### Scenario:` maps 1:1 to a named `it()`. Coverage: 85%+ on `src/domain/`.

- [x] 0.1 [wire] Create `src/domain/entities/`, `src/domain/value-objects/`, `src/domain/services/`
- [x] 0.2 [wire] Create `src/ports/` for port interfaces
- [x] 0.3 [wire] Create `src/adapters/foundry/` and `src/adapters/in-memory/`
- [x] 0.4 [wire] Create `tests/unit/domain/`, `tests/unit/ports/`, `tests/unit/helpers/`, `tests/smoke/`
- [x] 0.5 [wire] Configure `vitest.config.ts` — exclude `src/adapters/foundry/**` and `tests/smoke/**`; target 85%+ on `src/domain/`
- [x] 0.6 [wire] Write `tests/unit/helpers/fixtures.ts` — factories for `RegistryEntry`, `RegistryDocument`, `DtkModuleEntry` test stubs

## 1. Module Scaffold

- [x] 1.1 [wire] Create `module.json` (id: `dtk`, optional dependencies on all DTK modules, compatibility v12–v14)
- [x] 1.2 [wire] Configure `package.json` with Vite build, TypeScript 5+, Vitest
- [x] 1.3 [wire] Configure `tsconfig.json` (strict, ESNext, bundler moduleResolution, fvtt-types devDependency)
- [x] 1.4 [wire] Set up `vite.config.ts` bundling `src/index.ts` → `module/dtk.js`, copying Handlebars templates
- [x] 1.5 [wire] Write `src/index.ts` — entry point wiring all subsystems; registers `Hooks.on('init')` and `Hooks.on('ready')`

## 2. Registry Domain

- [x] 2.1 [test]  Write failing Vitest tests for all module-registry/spec.md scenarios (valid entry, missing manifestUrl, invalid tier, invalid semver, document shape, cache persistence)
- [x] 2.2 [impl]  Write `src/domain/value-objects/RegistryEntry.ts`, `RegistryDocument.ts`, `RegistryCache.ts` — immutable Zod-validated shapes
- [x] 2.3 [impl]  Write `src/domain/value-objects/ModuleVersion.ts` — semver wrapper with `isNewerThan(other)` comparison
- [x] 2.4 [port]  Declare `IRegistryStore` (`load(): RegistryCache | null`, `save(doc, fetchedAt): void`) in `src/ports/`
- [x] 2.5 [port]  Declare `IRegistryFetcher` (`fetch(url): Promise<RegistryDocument>`) in `src/ports/`
- [x] 2.6 [stub]  Write `src/adapters/in-memory/InMemoryRegistryStore.ts` and `StubRegistryFetcher.ts`
- [x] 2.7 [adapt] Write `src/adapters/foundry/FoundryRegistryStore.ts` (`game.settings` read/write) and `FoundryRegistryFetcher.ts` (fetch + 10s timeout)

## 3. Update Check Service

- [x] 3.1 [test]  Write failing Vitest tests for all update-checker/spec.md scenarios (outdated detected, up-to-date skipped, not-installed ignored, cache fallback on fetch failure)
- [x] 3.2 [impl]  Write `src/domain/services/UpdateCheckService.ts` — `check(registry, installedVersions): string[]`; pure function, no Foundry globals
- [x] 3.3 [port]  Declare `INotificationService` (`info(message): void`, `warn(message): void`) in `src/ports/`
- [x] 3.4 [stub]  Write `src/adapters/in-memory/InMemoryNotificationService.ts` — captures messages for assertions
- [x] 3.5 [adapt] Write `src/adapters/foundry/FoundryNotificationService.ts` — delegates to `ui.notifications`

## 4. Module Coordinator

- [x] 4.1 [test]  Write failing Vitest tests for all module-coordinator/spec.md scenarios (game.dtk available, frozen object, registration, duplicate warning, readiness collection, timeout, api() and isInstalled() return values)
- [x] 4.2 [impl]  Write `src/domain/entities/DtkModuleEntry.ts` — entity (id, version, api, ready flag)
- [x] 4.3 [impl]  Write `src/domain/services/ModuleCoordinator.ts` — pure coordination logic: register, markReady, allReady, getApi; no Foundry globals
- [x] 4.4 [adapt] Write `src/adapters/foundry/FoundryNamespace.ts` — creates and freezes `game.dtk`; wires `ModuleCoordinator`; registers `Hooks.on('dtk-{id}.ready')` listeners; fires `dtk.ready`; implements 10s timeout with console warning
- [x] 4.5 [wire]  Register module settings on `init`: `dtk.registryUrl` and `dtk.registryCache` (hidden world setting)
- [x] 4.6 [wire]  Wire `ready` hook handler: GM-only guard → fetch registry via `IRegistryFetcher` → save via `IRegistryStore` → run `UpdateCheckService` → show notification if updates found

## 5. Installer UI

- [x] 5.1 [port]  Declare `IModuleInstaller` (`install(manifestUrl): void | clipboard fallback`) in `src/ports/`
- [x] 5.2 [stub]  Write `src/adapters/in-memory/SpyModuleInstaller.ts` — records install calls for assertions
- [x] 5.3 [adapt] Write `src/adapters/foundry/FoundryModuleInstaller.ts` — attempt `game.modules._install()`; fall back to clipboard copy + notification; premium URLs open `changelogUrl` in new tab
- [x] 5.4 [impl]  Write `src/adapters/foundry/InstallerApp.ts` — `ApplicationV2` + `HandlebarsApplicationMixin`; GM-only open guard; renders free/premium sections; Install/Update/Up-to-date button states; Refresh with spinner
- [x] 5.5 [impl]  Write `templates/installer.hbs` — two sections (Free / Premium); per-entry name, installed/available version, tier badge, description, action button
- [x] 5.6 [wire]  Register "Manage DTK Modules" button in hub module settings pointing to `InstallerApp.render(true)`
- [x] 5.7 [wire]  Investigate `game.modules._install()` API availability on v12/v13/v14; document fallback in code comment

## 6. Module JSON and Load Order

- [x] 6.1 [wire]  Verify `module.json` lists dtk-systema, dtk-alea, dtk-promptuarium, dtk-opus, dtk-lex as `optionalDependencies`
- [x] 6.2 [wire]  Confirm `module.json` compatibility ranges cover v12, v13, v14 verified Foundry versions

## 7. Integration Smoke Tests

- [x] 7.1 [smoke] Install built `dtk` module in local Foundry; verify `game.dtk` is defined and frozen after `init`
- [x] 7.2 [smoke] Install stub "hello-dtk" test module; verify it registers, fires `dtk-hello.ready`, and `dtk.ready` fires with it in `game.dtk.modules`
- [x] 7.3 [smoke] Open installer window as GM; verify free/premium sections render; verify "Manage DTK Modules" button in settings
- [x] 7.4 [smoke] Simulate outdated module in registry; verify single update notification appears on session load
