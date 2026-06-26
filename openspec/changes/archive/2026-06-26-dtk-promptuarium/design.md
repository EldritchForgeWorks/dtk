## Context

dtk-promptuarium is a build-time CLI tool used by game system authors, not a runtime
module for players. Its prototype is the `promptuarium` reference implementation.
The key shift from prototype: the prototype required TypeScript to define Exemplar
behaviours; dtk-promptuarium compiles pure YAML Exemplars that reference declarative
Rule/Sequence/Action kinds introduced in the DTK redesign.

dtk-promptuarium has two faces:
- **CLI** (`@dtk/promptuarium` npm package): runs in Node.js, reads YAML, writes
  LevelDB — no Foundry globals anywhere
- **Foundry runtime module** (`dtk-promptuarium`): thin module face that exposes
  `PromptariumApi.validate()` via `game.dtk` for runtime schema validation

The hexagonal split separates the domain (corpus validation, NL generation) from
infrastructure (YAML file reading, LevelDB writing, LLM API calls).

```
game system repo/
├── exemplars/
│   ├── species/elf.yaml
│   ├── rules/ranged-attack.yaml
│   └── sequences/full-attack.yaml
└── codex.yaml

  promptuarium compile
        │
        ▼
  ExemplarSource (YAML reader)
        │ raw objects
        ▼
  CorpusValidator              ← ExemplarSchema validation + cross-ref checks
        │ validated ExemplarCorpus
        ▼
  [optional] NLGenerator       ← Handlebars templates + Codex slug resolution
        │                        + optional LLM polish (cached)
        ▼
  ExemplarCompiler             ← transforms to Foundry compendium document shape
        │ compiled documents
        ▼
  CompendiumTarget (LevelDB writer)
        │
        ▼
  game-system/packs/*.db       ← Foundry compendium packs
```

## Goals / Non-Goals

**Goals:**
- Validate YAML Exemplar files against `@dtk/types` ExemplarSchema
- Cross-reference checks: parent ids exist in corpus, ref ids exist, slug uniqueness
- Compile validated corpus to Foundry-compatible LevelDB packs
- Generate natural-language `description` fields for rule/sequence/action Exemplars
- Optional LLM polish pass with per-entry cache in `.promptuarium-cache.json`
- Foundry runtime `validate()` for on-the-fly schema checking
- Zero Foundry globals in CLI path

**Non-Goals:**
- Dice execution (dtk-alea)
- Character creation wizard (dtk-opus)
- Expression evaluation at compile time (Lex)
- Live compendium editing (Foundry's built-in tooling)
- Asset bundling or module packaging (Vite / build tooling)

## Decisions

### D1: ExemplarCorpus is the domain aggregate

The compiler builds an `ExemplarCorpus` entity from all validated Exemplars. The
corpus owns: the full id→Exemplar map, the cross-reference graph, and the validation
error list. All corpus-wide queries (does id X exist? are all parents valid?) go
through the corpus — individual Exemplar objects do not reference each other directly.

---

### D2: Two-phase compile — validate then write

The compiler runs validation and cross-reference checking as a complete pass before
writing any LevelDB output. If validation produces any errors, the compile halts and
reports all errors; no partial output is written. The `validate` subcommand is phase 1
only, with no write step.

**Why:** Partial LevelDB writes can corrupt the compendium pack state. Full-corpus
validation-before-write is safer and gives game system authors the complete error list
in one pass.

---

### D3: NL generation — Handlebars templates + Codex slug resolution

The `NLGenerator` uses Handlebars templates per Exemplar kind:

- `kind: rule` → "Roll `{{pool}}` dice against `{{ritus.name}}`. On a `{{tier.hit}}`:
  `{{on_tier.hit.damage}}` damage. On a `{{tier.critical}}`: ..."
- `kind: sequence` → "A sequence of {{steps.length}} steps: {{#each steps}}{{actor}}
  performs {{rule.name}}{{/each}}."
- `kind: action` → "{{name}}. {{sequence.description}}. Costs: {{cost}}."

Slug resolution: Codex attribute/skill slugs (e.g., `"agility"`) are resolved to
display names (e.g., `"Agility"`) via a compiled `codex.json` file provided to the
CLI. Without Codex, slugs are used as-is.

**Why Handlebars:** Already in the Foundry ecosystem (Foundry uses it). Deterministic,
no LLM required for baseline descriptions.

---

### D4: LLM polish — optional, cached, configurable

If `--llm` is passed to `promptuarium describe`, a configurable OpenAI-compatible
API call polishes each generated description. The polished text is cached to
`.promptuarium-cache.json` keyed by `{exemplarId}:{contentHash}`. On subsequent runs,
cached entries are reused (no re-polish unless the source Exemplar changes).

The LLM client is injected via `ILLMClient` port — the CLI wires `OpenAILLMClient`;
tests use `StubLLMClient`.

---

### D5: LevelDB format — Foundry ClassicLevel / NeDB compatible

Foundry v12+ uses ClassicLevel (LevelDB) for compendium packs. Each entry is stored
as a key-value pair where key = `!items!{id}` (for items), `!actors!{id}`, etc. and
value = JSON-serialised Foundry document.

The `ExemplarCompiler` transforms each validated Exemplar to the Foundry document
shape: Exemplar fields → `system.*` fields as defined by the game system's Modus data
models. The Modus `outputMapper` string (declared in `modus.yaml`) specifies how
Exemplar fields map to document fields.

---

### D6: Foundry runtime face — minimal, validation only

The Foundry-side `dtk-promptuarium` module exposes a single API method:
`PromptariumApi.validate(value: unknown): ValidationResult`. It uses
`ExemplarSchema.safeParse()` from `@dtk/types` — no Node.js-only APIs, no file I/O.
This is the same schema the CLI uses; the runtime face is just a thin Foundry
registration wrapper around it.

## Module Architecture

```
packages/promptuarium/src/      (Node.js CLI — @dtk/promptuarium)
├── domain/
│   ├── entities/
│   │   └── ExemplarCorpus.ts       aggregate; id→Exemplar map + cross-ref graph
│   ├── value-objects/
│   │   ├── CompiledEntry.ts        Foundry document shape for one Exemplar
│   │   ├── ValidationError.ts      { exemplarId, field, message }
│   │   └── GeneratedDescription.ts { exemplarId, text, cached }
│   └── services/
│       ├── CorpusValidator.ts      ExemplarSchema validation + cross-ref checks
│       ├── ExemplarCompiler.ts     Exemplar → CompiledEntry (Foundry doc shape)
│       └── NLGenerator.ts         Handlebars templates + Codex resolution + LLM polish
├── ports/
│   ├── IExemplarSource.ts          list() → RawExemplar[]; read YAML files
│   ├── ICompendiumTarget.ts        write(packId, entries[]) → void; LevelDB
│   ├── ICodexProvider.ts           resolveSlug(slug) → displayName string
│   └── ILLMClient.ts               polish(text, hint) → Promise<string>
└── adapters/
    ├── node/
    │   ├── YamlExemplarSource.ts       fs.readdir + yaml.parse
    │   ├── LevelDBCompendiumTarget.ts  ClassicLevel write
    │   ├── JsonCodexProvider.ts        reads compiled codex.json
    │   └── OpenAILLMClient.ts          fetch to OpenAI-compatible API
    └── in-memory/
        ├── InMemoryExemplarSource.ts   returns fixture array
        ├── InMemoryCompendiumTarget.ts captures writes for assertions
        ├── StubCodexProvider.ts        slug → "Slug (display)" passthrough
        └── StubLLMClient.ts            returns input text unchanged

module/src/      (Foundry module — dtk-promptuarium)
└── foundry-api.ts      game.dtk.register(); PromptariumApi.validate() wrapper
```

**VitestSuite targets:**
- `packages/promptuarium/src/domain/` — 85%+ statement coverage
- `packages/promptuarium/src/adapters/in-memory/` — 100%
- `packages/promptuarium/src/adapters/node/` — excluded from unit tests (file I/O / network); covered by CLI integration tests

## Risks / Trade-offs

- **LevelDB write format drift** → Foundry may change its pack format between versions; mitigation: integration test against actual Foundry instance on each supported version
- **LLM cache invalidation** → if a template changes, cached descriptions become stale; mitigation: cache key includes a template version hash, not just content hash
- **Modus outputMapper complexity** → mapping Exemplar fields to Foundry document fields may require transformation logic; if outputMapper is a simple JSON path map, edge cases may need escape hatches; keep outputMapper simple in v1

## Open Questions

- Q1: Should `promptuarium compile` also run `describe` automatically when descriptions are absent, or is it a separate explicit step? Recommendation: separate step — LLM calls have cost implications; game system authors should opt in explicitly.
- Q2: For `kind: rule` Exemplars, how much of the `on_tier` consequence structure should NL generation attempt to describe? Full description risks being verbose; summary-only loses detail. Recommendation: generate a one-sentence summary per tier, not full consequence prose.
