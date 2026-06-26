## Why

Game systems built with DTK need a single TypeScript call to wire up Foundry VTT —
registering actors, items, data models, settings, and hooks — without writing
boilerplate. Beyond bootstrapping, they also need the runtime machinery that bridges
Foundry's canvas and UI to dtk-alea's execution engine: target selection, action
menus, context assembly, and player-decision relay. dtk-systema is that bridge.

## What Changes

- Introduces the `dtk-systema` Foundry module as a new independent repo
- Provides `defineSystem(modus: Modus)` as the primary API for game system authors
- Owns the action menu — an ApplicationV2 panel listing available actions for a
  selected token, with condition-based greying and one-click execution
- Owns the full targeting workflow — canvas token selection, area template placement,
  self-targeting, filter evaluation — resolving to a flat target list before handing
  off to dtk-alea
- Owns context assembly — builds the `RollContext` (actor, targets, item, combat
  state, step inputs) that dtk-alea requires
- Owns the await/relay layer — when dtk-alea suspends for a player decision, systema
  renders the decision UI and relays responses via Foundry socket; state survives
  disconnect/reconnect via Combat flags
- Exposes a `SystemaApi` surface registered with `game.dtk`

## Capabilities

### New Capabilities

- `define-system`: The `defineSystem(modus: Modus)` entry point — registers Foundry
  actor types, item types, TypeScript data models, system settings, and DTK hooks from
  a Modus contract. Game system authors call this once in their module's `init` hook.
- `action-menu`: The GM/player-facing ApplicationV2 action panel for a selected token.
  Displays actions sourced from the actor's resolved Exemplar grants; evaluates action
  conditions to determine available vs. greyed state; triggers the execution pipeline
  on click.
- `targeting`: The targeting workflow that runs before dtk-alea executes. Dispatches
  by targeting mode (`token`, `self`, `area`, `none`); handles canvas token selection
  with min/max/filter constraints; places MeasuredTemplate for area modes; builds the
  resolved target list passed to dtk-alea.
- `context-builder`: Assembles the `RollContext` object from Foundry documents and
  combat state. Reads actor attributes, active item, selected targets, current Combat
  round/turn, and any step inputs. Validates the assembled context against the
  `@dtk/types` RollContext interface before handing off to dtk-alea.
- `await-relay`: Listens for `dtk-alea.await` hooks; renders a decision dialog for the
  designated actor(s); relays the chosen response back to dtk-alea via Foundry socket
  (GM-relay pattern for non-GM actors); persists pending-decision state to
  `Combat.flags['dtk-alea']` so the sequence survives client disconnect.

### Modified Capabilities

_(none — this change introduces only new capabilities)_

## Impact

- **New Foundry module**: `dtk-systema`, independent repo, free tier
- **Depends on**: `dtk` (hub, for `game.dtk.register()`), `@dtk/types` (devDependency for Modus, RollContext, SystemaApi interfaces)
- **Consumed by**: dtk-alea (receives RollContext), every DTK game system (calls `defineSystem()`)
- **Foundry integration points**: `Hooks.on('init')` for system registration; `Hooks.on('controlToken')` for action menu; Foundry socket for GM-relay; `Combat.flags` for sequence state persistence; `MeasuredTemplate` for area targeting
- **Does NOT own**: dice execution (dtk-alea), compendium compilation (dtk-promptuarium), character wizard (dtk-opus)
- **`SystemaApi`**: `defineSystem`, `version`, `isReady` — registered with `game.dtk.register()` on dtk-systema's `init` hook and available via `game.dtk.api<SystemaApi>('dtk-systema')`
