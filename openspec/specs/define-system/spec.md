# define-system Specification

## Purpose
TBD - created by archiving change dtk-systema. Update Purpose after archive.
## Requirements
### Requirement: defineSystem validates Modus on receipt

`defineSystem` SHALL validate the provided Modus object against `ModusSchema` from
`@eldritchforgeworks/dtk-types/modus` before performing any Foundry registration. If validation fails,
it SHALL throw a descriptive error identifying the invalid fields. Execution stops;
no partial registration occurs.

#### Scenario: Valid Modus proceeds to registration

- **WHEN** `defineSystem(validModus)` is called with a schema-valid Modus
- **THEN** Foundry registration begins without error

#### Scenario: Invalid Modus throws before registration

- **WHEN** `defineSystem({ id: "sr5e" })` is called with a Modus missing required fields
- **THEN** a descriptive error is thrown and no Foundry APIs are called

---

### Requirement: defineSystem must be called during the init hook

`defineSystem` SHALL detect if it is called outside the Foundry `init` hook timing
window (i.e., after `setup` has already fired). If called too late, it SHALL throw:
`"defineSystem() must be called from your system's Hooks.on('init') handler"`.

#### Scenario: Late call throws descriptive error

- **WHEN** `defineSystem(modus)` is called from a `ready` hook handler
- **THEN** a descriptive error is thrown with instructions to move the call to `init`

---

### Requirement: Actor type registration

For each key in `modus.actors`, `defineSystem` SHALL register a Foundry actor type by
calling `CONFIG.Actor.dataModels[typeName] = DataModelClass` where `DataModelClass` is
a `TypeDataModel` subclass generated from the actor's `dataModel` schema in the Modus.
The registered type name SHALL match the Modus actor key exactly.

#### Scenario: Actor types registered for all Modus actor keys

- **WHEN** `modus.actors` contains keys `"character"` and `"npc"`
- **THEN** `CONFIG.Actor.dataModels["character"]` and `CONFIG.Actor.dataModels["npc"]`
  are both populated after `defineSystem` runs

#### Scenario: Actor data model accepts valid actor data

- **WHEN** an actor document of a registered type is created with valid `system` fields
- **THEN** Foundry validates the document against the registered data model without error

---

### Requirement: Item type registration

For each key in `modus.items` (if declared), `defineSystem` SHALL register a Foundry
item type via `CONFIG.Item.dataModels[typeName]`. Item registration follows the same
pattern as actor registration.

#### Scenario: Item types registered when modus.items is declared

- **WHEN** `modus.items` contains key `"weapon"`
- **THEN** `CONFIG.Item.dataModels["weapon"]` is populated after `defineSystem` runs

#### Scenario: No item types registered when modus.items is absent

- **WHEN** `modus.items` is not declared in the Modus
- **THEN** `defineSystem` completes without touching `CONFIG.Item.dataModels`

---

### Requirement: System settings registration

For each entry in `modus.settings` (if declared), `defineSystem` SHALL call
`game.settings.register(systemId, key, config)` to register the setting. The
`systemId` SHALL match `modus.id`. Settings are registered before `setup` fires.

#### Scenario: Settings registered from modus.settings

- **WHEN** `modus.settings` declares a `"houseRules.maxInitiative"` setting
- **THEN** `game.settings.register("sr5e", "houseRules.maxInitiative", ...)` is called

---

### Requirement: Ritus and Codex references wired to optional modules

If `modus.ritus` is declared, `defineSystem` SHALL call
`game.dtk.api<AleaApi>('dtk-alea')?.registerRitus(ritus)` after dtk-alea is ready
(listening for `dtk-alea.ready` if dtk-alea is installed). If dtk-alea is not
installed, the Ritus registration is skipped silently with a console info log.

Same pattern for `modus.codex` → `LexApi.registerPlugin(codex)`.

#### Scenario: Ritus registered when dtk-alea is installed

- **WHEN** dtk-alea is installed and active and `modus.ritus` is declared
- **THEN** `AleaApi.registerRitus(ritus)` is called after dtk-alea signals ready

#### Scenario: Ritus skipped when dtk-alea is absent

- **WHEN** dtk-alea is not installed and `modus.ritus` is declared
- **THEN** `defineSystem` completes without error; a console info log notes the skipped registration

---

### Requirement: defineSystem registers dtk-systema with game.dtk

dtk-systema SHALL call `game.dtk.register({ id: 'dtk-systema', version, api: systemaApi })` during its `init` hook handler, before the game system author calls `defineSystem()`. The `systemaApi` object exposes `defineSystem`, `version`, and `isReady`.

#### Scenario: SystemaApi accessible via game.dtk after init

- **WHEN** dtk-systema's `init` hook has fired
- **THEN** `game.dtk.api<SystemaApi>('dtk-systema')?.defineSystem` is callable

---

### Requirement: dtk-systema fires dtk-systema.ready

dtk-systema SHALL fire `Hooks.callAll('dtk-systema.ready')` after completing all async registration steps (including waiting for dtk-alea and dtk-lex ready signals if applicable). The hub then marks systema as ready in the `dtk.ready` coordination flow.

#### Scenario: dtk-systema.ready fires after registration completes

- **WHEN** all registration steps in defineSystem have completed
- **THEN** `Hooks.callAll('dtk-systema.ready')` is emitted

