## Context

One repo currently hosts eight Foundry modules (`module/` = hub `dtk`, plus seven under `packages/`). Foundry's installer and its v13 dependency auto-install need, per module: a stable `manifest` URL that always serves the newest `module.json`, and a `download` URL inside that manifest pointing at a versioned zip. GitHub's built-in `releases/latest/download/<asset>` shortcut resolves only the single most recent release of the whole repo — useless when eight modules release independently.

## Goals / Non-Goals

- Goals: one stable manifest URL per module; immutable versioned zips; single CI workflow; URLs that survive later extraction of modules into their own repos.
- Non-goals: premium gating, foundryvtt.com listing, repo split.

## Decision: per-module moving-tag releases

Tag `dtk-alea-v0.2.0` triggers CI, which publishes:

```
Release dtk-alea-v0.2.0        (immutable)
  ├── dtk-alea.zip             ← module.json "download" points here
  └── module.json
Release dtk-alea-latest        (moving — recreated on every dtk-alea release)
  ├── dtk-alea.zip
  └── module.json              ← stable manifestUrl target
```

Stable URL shape: `https://github.com/<owner>/dtk/releases/download/dtk-alea-latest/module.json`

### Options considered

| Option | Stable URL | Multi-module | Notes |
|---|---|---|---|
| A. `releases/latest/download/` | yes | **no** — one "latest" per repo | Rejected: eight modules, one repo |
| B. Per-module moving tag `<id>-latest` (chosen) | yes | yes | Standard pattern for multi-module repos; two extra CLI calls in CI |
| C. Versioned URLs only + registry indirection | no direct stable URL | yes | Breaks Foundry's own update flow — `manifest` inside module.json must itself be stable |
| D. GitHub Pages / raw.githubusercontent.com hosted manifests | yes | yes | Works, but adds a second publish surface to keep in sync; raw URLs lack release download stats and are cache-laggy |
| E. Split into eight repos now | yes (`releases/latest`) | n/a | Matches config's stated architecture end-state but is a much larger migration; not an M0 blocker. Tag scheme B converts cleanly later (`dtk-alea-v0.2.0` → `v0.2.0`) |

### Change from prototype

The `module-registry` spec assumed registry entries with `manifestUrl` would simply exist; this design makes CI the producer of those URLs and the registry document a generated artifact, not hand-maintained data.

## Flow

```
git tag dtk-alea-v0.2.0 && git push --tags
        │
        ▼
release.yml (match: */-v* tag)
  1. parse module-id + version from tag
  2. npm ci && npm run build   (in that module's directory)
  3. stamp module.json: version, manifest (…/<id>-latest/module.json),
     download (…/<id>-v<ver>/<id>.zip)
  4. zip contents at archive root
  5. gh release create <id>-v<ver>  <id>.zip module.json
  6. gh release delete <id>-latest --cleanup-tag (if exists)
     gh release create <id>-latest  <id>.zip module.json
  7. regenerate registry JSON entry for <id> (manifestUrl, latestVersion)
```

## Risks / Trade-offs

- Moving tags are technically mutable history — acceptable; only `-latest` moves, versioned tags never do.
- `dtk-shadowrun` ships `packs/` (LevelDB dirs) — the zip step must include compiled packs, not `src/packs` JSON.
- Registry regeneration inside CI needs a commit or a release-asset home for the JSON; simplest v1 is attaching `registry.json` to the hub's `dtk-latest` release or committing to the default branch — decide in task 4.
