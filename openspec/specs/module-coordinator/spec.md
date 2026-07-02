# module-coordinator Specification

## Purpose
TBD - created by archiving change dtk-hub. Update Purpose after archive.
## Requirements
### Requirement: game.dtk namespace initialised on init hook

The hub SHALL attach a `game.dtk` object during the Foundry `init` hook, before any
other DTK module's `init` hook fires (achieved via load order). `game.dtk` SHALL be
frozen after creation to prevent accidental mutation by other modules. It SHALL expose:

- `version: string` — the hub module's version string
- `modules: Map<string, DtkModuleEntry>` — registrations, keyed by module id
- `register(entry: DtkModuleEntry): void` — called by each DTK module on its own `init`
- `api<T>(moduleId: string): T | undefined` — implements `getDtkModuleApi`
- `isInstalled(moduleId: string): boolean` — implements `isDtkModuleInstalled`

`DtkModuleEntry` SHALL carry `{ id: string, version: string, api: unknown, ready: boolean }`.

#### Scenario: game.dtk available after hub init

- **WHEN** the hub's `init` hook handler fires
- **THEN** `game.dtk` is defined and its `version`, `modules`, `register`, `api`, and `isInstalled` properties are accessible

#### Scenario: game.dtk is frozen

- **WHEN** external code attempts `game.dtk.version = "hacked"`
- **THEN** the assignment silently no-ops (strict mode throws; sloppy mode ignores)

---

### Requirement: DTK module registration

Other DTK modules SHALL call `game.dtk.register({ id, version, api })` from their own
`init` hook. The hub SHALL add the entry to `game.dtk.modules` with `ready: false`.
Duplicate registrations (same `id` called twice) SHALL overwrite the previous entry
and log a console warning.

#### Scenario: Module registration accepted

- **WHEN** `game.dtk.register({ id: "dtk-systema", version: "0.3.0", api: systemaApi })` is called
- **THEN** `game.dtk.modules.get("dtk-systema")` returns the entry with `ready: false`

#### Scenario: Duplicate registration warns and overwrites

- **WHEN** `game.dtk.register({ id: "dtk-alea", ... })` is called twice
- **THEN** a `console.warn` is emitted and the second entry replaces the first

#### Scenario: Module registered after dtk.ready fires is accepted but not awaited

- **WHEN** a module calls `game.dtk.register()` after `dtk.ready` has already fired
- **THEN** the entry is added to `game.dtk.modules` and a console warning notes it missed the ready window

---

### Requirement: dtk.ready hook — collecting readiness signals

Each DTK module SHALL fire `Hooks.callAll('dtk-{id}.ready')` (e.g., `dtk-systema.ready`)
when its own async initialisation completes. The hub SHALL listen for these hooks
(registered during `init`) and mark the corresponding entry as `ready: true`.

When all registered-and-active entries are `ready: true`, the hub SHALL fire
`Hooks.callAll('dtk.ready', game.dtk)`. If any registered module has not signalled
readiness within 10 seconds of the Foundry `ready` hook, the hub SHALL log a warning
naming the timed-out module(s) and fire `dtk.ready` anyway.

#### Scenario: dtk.ready fires after all modules signal readiness

- **WHEN** both dtk-systema and dtk-alea have called `game.dtk.register()` and each fires their `.ready` hook
- **THEN** `dtk.ready` fires with `game.dtk` as its argument

#### Scenario: dtk.ready fires with partial readiness on timeout

- **WHEN** dtk-systema fires `dtk-systema.ready` but dtk-alea never fires within 10 seconds
- **THEN** a console warning names `dtk-alea` as timed out and `dtk.ready` still fires

#### Scenario: dtk.ready fires immediately when no modules registered

- **WHEN** no DTK modules called `game.dtk.register()` during `init`
- **THEN** `dtk.ready` fires immediately when the Foundry `ready` hook runs

---

### Requirement: getDtkModuleApi implementation

`game.dtk.api<T>(moduleId: string): T | undefined` SHALL return
`game.dtk.modules.get(moduleId)?.api as T | undefined`. It returns `undefined` if the
module is not registered. This is the runtime implementation of the `getDtkModuleApi`
stub declared in `@eldritchforgeworks/dtk-types/apis`.

#### Scenario: api returns typed api when module registered

- **WHEN** dtk-alea has registered with an `api` object and `game.dtk.api<AleaApi>("dtk-alea")` is called
- **THEN** the AleaApi object is returned

#### Scenario: api returns undefined for unregistered module

- **WHEN** `game.dtk.api("dtk-lex")` is called and dtk-lex has not registered
- **THEN** `undefined` is returned without throwing

---

### Requirement: isDtkModuleInstalled implementation

`game.dtk.isInstalled(moduleId: string): boolean` SHALL return `true` if
`game.modules.get(moduleId)?.active` is truthy. This is the runtime implementation of
the `isDtkModuleInstalled` stub declared in `@eldritchforgeworks/dtk-types/apis`.

#### Scenario: isInstalled returns true for active module

- **WHEN** `dtk-systema` is installed and active and `game.dtk.isInstalled("dtk-systema")` is called
- **THEN** it returns `true`

#### Scenario: isInstalled returns false for absent module

- **WHEN** `game.dtk.isInstalled("dtk-lex")` is called and dtk-lex is not installed
- **THEN** it returns `false` without throwing

