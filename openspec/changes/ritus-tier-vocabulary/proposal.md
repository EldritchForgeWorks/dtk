## Why

Requested by: Officina golden-test findings, 2026-07-02 (see
`openspec/changes/fix-promptuarium-compile-mapping/OFFICINA-FINDINGS.md`).
Decision made by the principal's delegate, 2026-07-02.

Two contract-drift defects between `@eldritchforgeworks/dtk-types@0.1.0` and the
shipped shadowrun pack content:

1. **`keepMode: ""` in `SR6DicePool.json` is rejected by RitusSchema** — the enum
   allows only `'highest' | 'lowest'` or key absence.
2. **Tiers vocabulary mismatch is silently destructive** — the pack declares
   `{miss, hit, strong, exceptional}` while `RitusTiersSchema` is a fixed
   `{critical?, hit, glancing?}` triple. Non-strict Zod parsing STRIPS the unknown
   keys without error: a Ritus round-tripped through the schema loses its tier
   definitions.

## Decision record

The fixed triple was the outlier, not the pack content:

- Alea's `TierResolver.classify` already resolves from an arbitrary
  `Record<string, number>` map (highest threshold ≤ net hits wins) — it never
  depended on the `critical`/`hit`/`glancing` names.
- `MechanicSequenceStep.tiers` in the sequence contract is already
  `z.record(z.string(), z.number())`.
- The shadowrun reference vocabulary (`miss`/`hit`/`strong`/`exceptional`) is
  valid, intentional content that the fixed schema silently destroyed.

Therefore: **`RitusTiersSchema` becomes a free tier vocabulary** —
`z.record(<tier-name>, <hit-threshold>)` where:

- tier names are lowercase slugs matching `/^[a-z][a-z0-9-]*$/`;
- thresholds are nonnegative integers;
- at least one entry is required;
- threshold VALUES must be unique — `TierResolver` maps hit counts to a tier, so
  duplicate thresholds are ambiguous.

The old `critical > hit > glancing` ordering refinement is deleted. The exported
type becomes `RitusTiers = Readonly<Record<string, number>>`.

`SR6DicePool.json` drops the invalid `keepMode: ""` key (a data bug — the schema
keeps its strict enum). Its tiers stay exactly as-is and are now schema-valid.

`RitusSchema`'s inner object gains `.strict()` so future unknown keys fail loudly
instead of being silently stripped (applied to the inner `z.object` before the
`superRefine`/`transform` chain — `RitusSchema` itself stays a ZodEffects).

`@eldritchforgeworks/dtk-types` bumps to **0.2.0** (breaking type change).
Publishing to npm is out of scope for this change.

## What Changes

- `packages/types/src/ritus/schema.ts`: free-vocabulary `RitusTiersSchema`
  (record + slug key rule + uniqueness/at-least-one superRefine), `.strict()`
  on the Ritus object, `RitusTiers` type.
- `packages/types/tests`: fixed-triple ordering tests removed; new tests for
  free vocabulary, slug rule, threshold uniqueness, at-least-one, unknown-key
  strictness, and a regression asserting the shadowrun vocabulary
  `{miss: 0, hit: 1, strong: 4, exceptional: 6}` round-trips WITHOUT loss.
- `packages/shadowrun/src/packs/sr-ritus/SR6DicePool.json`: `keepMode: ""`
  removed; packs rebuilt.
- Consumers (alea, systema): mechanical adaptation only if compilation breaks —
  no behavior redesign.
- `packages/types/package.json`: version 0.1.0 → 0.2.0.

## Non-goals

- No npm publish (handled outside this change).
- No change to `RuleExemplarSchema.tiers` (the per-action override in the
  exemplar contract) — reconciling that vocabulary is a separate decision.
- No change to `TierResolver` behavior.

## Capabilities

### Modified Capabilities

- `ritus`: outcome tiers become a free vocabulary; unknown Ritus keys rejected
  loudly.

## Impact

- `packages/types` (schema, type, tests) — SemVer-breaking for `RitusTiers`
  consumers typed against the fixed triple.
- `packages/shadowrun` pack source + committed LevelDB artifacts.
- **Downstream**: Officina golden fixtures pin both findings; this change makes
  the shipped pack content schema-valid and lossless.
