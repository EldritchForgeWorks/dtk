## Context

The `dtk` Foundry module lives in this repo alongside `@dtk/types`. It is the only
module a user installs directly — everything else flows through it. It must coordinate
an open-ended set of DTK modules it cannot know about at compile time, so its coupling
is deliberately inverted: other DTK modules announce themselves to the hub, not the
reverse.

The hub has no role in the actual game-system runtime (no dice, no sheets, no rules).
It is infrastructure only.

## Goals / Non-Goals

**Goals:**
- Single manifest URL to share: install `dtk` and get the catalog
- Implement `getDtkModuleApi` / `isDtkModuleInstalled` (declared in `@dtk/types/apis`)
- Expose `game.dtk` namespace so other modules can register and be discovered
- Emit `dtk.ready` after all active DTK modules have fired their own ready hooks
- GM-facing installer UI for free and premium modules
- Passive update checker on each session (GM only)

**Non-Goals:**
- Payment processing or license enforcement (premium gating is each module's own concern)
- Replacing Foundry's native module installer (we invoke it, not replace it)
- Any runtime game-system logic
- Module configuration UI (each module owns its own settings UI)

## Decisions

### D1: Repo co-location — hub module and @dtk/types in same repo

The `dtk` Foundry module (`/module/`) and `@dtk/types` npm package (`/packages/types/`)
live in the same repository. Two separate build pipelines: Vite for the Foundry module,
tsc for the types package.

**Alternatives considered:**
- Separate repo for each — extra overhead, harder to keep in sync when contracts evolve
- Monorepo with workspace packages — rejected (not a monorepo by design)

**Why this:** The hub is the natural home for the types package. Both are free-tier,
always co-released. One repo to install from, one repo to watch for contract changes.

---

### D2: game.dtk namespace shape

The hub exposes a frozen `game.dtk` object on the Foundry `init` hook:

```
game.dtk = {
  version: string,           // hub module version
  modules: Map<string, DtkModuleEntry>,  // keyed by module id
  register(entry: DtkModuleEntry): void, // called by each DTK module on its init
  api<T>(moduleId: string): T | undefined,  // implements getDtkModuleApi
  isInstalled(moduleId: string): boolean,   // implements isDtkModuleInstalled
}
```

`DtkModuleEntry` = `{ id: string, version: string, api: unknown, ready: boolean }`.

Other DTK modules call `game.dtk.register(...)` from their own `init` hook. The hub
collects these registrations and waits for each to signal readiness.

**Why this:** The namespace is the seam. Inverting control here means the hub never
imports from other DTK modules — it just holds what they give it. Clean one-way coupling.

---

### D3: dtk.ready hook — collecting readiness signals

Each DTK module fires `Hooks.callAll('dtk-{id}.ready')` when it finishes its own
initialisation. The hub listens for these dynamically (registered on `init`, resolved
on `ready`). Once all registered-and-active modules have fired, the hub emits
`Hooks.callAll('dtk.ready')`.

```
init:
  dtk registers listeners for dtk-systema.ready, dtk-alea.ready, etc.
  (only for modules that called game.dtk.register() during init)

ready:
  hub checks: are all registered entries marked ready?
  yes → Hooks.callAll('dtk.ready', game.dtk)
  no  → wait (module may have errored; timeout after 10s with a console warning)
```

**Alternatives considered:**
- Hub polls `game.modules.get(id).active` — doesn't tell us when async init completes
- Hub imports each module's init function — circular coupling, violates the design

**Why this:** Event-driven, zero compile-time coupling. A new DTK module just needs to
call `game.dtk.register()` and fire its hook — the hub handles the rest automatically.

---

### D4: Remote registry — static JSON on GitHub Pages

The module catalog is a static JSON file hosted on GitHub Pages (or equivalent CDN)
at a URL stored in a world setting (with a default pointing to the official host). The
hub fetches it on `ready` (GM only) and caches it in world settings for offline use.

```json
{
  "version": 1,
  "modules": [
    {
      "id": "dtk-systema",
      "name": "DTK Systema",
      "tier": "free",
      "latestVersion": "0.3.1",
      "manifestUrl": "https://...",
      "description": "...",
      "dependencies": ["dtk"],
      "changelogUrl": "https://..."
    }
  ]
}
```

**Why static JSON:** Zero server infrastructure. Cached. Versioned via git. CDN-friendly.
The hub never needs a backend — it's a file fetch.

---

### D5: Installer UI — ApplicationV2 wrapping Foundry's native installer

The installer UI (ApplicationV2 + HandlebarsApplicationMixin) displays the registry
catalog with free/premium badges and installed/available version comparisons. The
"Install" button for each module constructs the manifest URL from the registry entry
and opens Foundry's native module manager pre-filled with that URL, rather than
attempting to install directly.

```
Installer UI (ApplicationV2)
  ├── Free modules list (always visible)
  └── Premium modules list (shows with "premium" badge, links to purchase page)

"Install" → game.modules._install(manifestUrl)  [Foundry internal, version-gated]
         OR → copy manifest URL to clipboard + toast notification
```

**Why piggyback on Foundry's installer:** Foundry manages module directories, manifest
validation, and integrity checks. Bypassing it risks corruption and breaks future
Foundry upgrades. We provide the catalog; Foundry does the filesystem work.

**Open question:** `game.modules._install()` is a private Foundry API. If it's not
reliably accessible across v12–v14, fall back to clipboard + notification.

---

### D6: Update checker — passive, GM-only, non-blocking

On the `ready` hook (GM only), the hub compares installed module versions against the
fetched registry. If any DTK module has a newer version available, it emits a single
Foundry UI notification: "DTK updates available — open the installer to update." No
auto-update, no per-module banners, one notification maximum per session.

**Why one notification:** Per-module banners are noisy. The hub aggregates.

## Risks / Trade-offs

- **`game.modules._install()` instability** → Mitigation: detect and fall back to
  clipboard copy with clear instructions; test on each supported Foundry version
- **Remote registry fetch fails (offline play)** → Mitigation: cache last-known registry
  in world settings; UI shows cached data with a "last updated" timestamp
- **Module fires dtk.ready before hub is ready** → Mitigation: hub `init` hook runs
  first (by load order); registrations before hub's `init` are dropped with a console
  warning advising the module to declare `dtk` as a dependency
- **dtk.ready timeout (module errors during init)** → Mitigation: 10-second timeout
  per module; hub logs which modules failed to signal and fires `dtk.ready` anyway
  so the rest of the ecosystem isn't blocked

## Open Questions

- Q1: Should premium modules be listed in the hub's catalog with a "purchase" link, or
  only shown to users who have a valid license token? Decision deferred — license
  enforcement is each premium module's own concern; hub shows all modules with tier
  badges and links to the purchase page.
- Q2: Exact Foundry version range for `game.modules._install()` availability — needs
  verification against v12, v13, v14 internals before shipping the installer UI.

---

## Module Architecture

dtk-hub follows the standard DTK hexagonal layout. Its domain is small and focused
on version comparison and registry validation — everything else is infrastructure.

```
module/src/
├── domain/
│   ├── entities/
│   │   └── DtkModuleEntry.ts       identity = module id; tracks registration + readiness
│   ├── value-objects/
│   │   ├── RegistryEntry.ts        immutable catalog entry (id, tier, version, url)
│   │   ├── RegistryDocument.ts     full fetched registry (version + entries array)
│   │   └── ModuleVersion.ts        semver wrapper with comparison methods
│   └── services/
│       ├── VersionComparator.ts    compares installed vs available versions
│       ├── UpdateCheckService.ts   produces list of outdated module names
│       └── ModuleCoordinator.ts    manages registration map + ready collection
├── ports/
│   ├── IRegistryStore.ts           read/write cached RegistryDocument (world settings)
│   ├── IRegistryFetcher.ts         fetch remote JSON → RegistryDocument
│   ├── IModuleInstaller.ts         install(manifestUrl) or clipboard fallback
│   └── INotificationService.ts     show info/warning/error notification
└── adapters/
    ├── foundry/
    │   ├── FoundryRegistryStore.ts     uses game.settings
    │   ├── FoundryRegistryFetcher.ts   fetch + 10s timeout
    │   ├── FoundryModuleInstaller.ts   native installer or clipboard
    │   └── FoundryNotificationService.ts  ui.notifications
    └── in-memory/
        ├── InMemoryRegistryStore.ts    Map<string, RegistryDocument>
        ├── StubRegistryFetcher.ts      returns configurable fixture
        └── InMemoryNotificationService.ts  captures notifications for assertions
```

**Port ↔ Adapter mapping:**

| Port | Foundry Adapter | In-Memory Stub |
|---|---|---|
| `IRegistryStore` | `FoundryRegistryStore` | `InMemoryRegistryStore` |
| `IRegistryFetcher` | `FoundryRegistryFetcher` | `StubRegistryFetcher` |
| `IModuleInstaller` | `FoundryModuleInstaller` | `SpyModuleInstaller` |
| `INotificationService` | `FoundryNotificationService` | `InMemoryNotificationService` |

**VitestSuite targets:**
- `src/domain/` — 85%+ statement coverage
- `src/adapters/foundry/` — excluded; covered by smoke test group 8
