# Additional contract-drift findings (from Officina golden tests, 2026-07-02)

Found while building Officina's dtk-types golden fixtures against the published
`@eldritchforgeworks/dtk-types@0.1.0` schemas and the shipped shadowrun pack
content (`packages/shadowrun/src/packs/sr-ritus/SR6DicePool.json`). Pinned by
tests in the Officina repo (`packages/core/src/source-format/dtk-types-golden.test.ts`).

1. **`keepMode: ""` in the shipped SR6DicePool pack is rejected by RitusSchema**
   (enum allows only `'highest' | 'lowest'` or key absent). Either the pack
   should drop the key or the schema should tolerate `""`.

   **RESOLVED** (2026-07-02, change `ritus-tier-vocabulary`): the pack drops the
   key — it was a data bug; the schema keeps its strict enum.

2. **Tiers vocabulary mismatch is silently destructive**: pack tiers
   `{miss, hit, strong, exceptional}` vs `RitusTiersSchema` `{critical?, hit, glancing?}`.
   Non-strict Zod parsing STRIPS the unknown keys without error — a Ritus
   round-tripped through the schema loses its tier definitions. Consider
   `.strict()` (loud failure) or a `z.record` tiers shape (accept custom
   vocabularies) — decide deliberately; both contracts can't stay as-is.

   **RESOLVED** (2026-07-02, change `ritus-tier-vocabulary`): both remedies
   applied — `RitusTiersSchema` is now a free `z.record` vocabulary (lowercase-slug
   names, nonnegative-integer thresholds, ≥1 entry, unique threshold values) AND
   the Ritus object is `.strict()` so unknown keys fail loudly. The shadowrun
   vocabulary round-trips losslessly (pinned by a regression test in
   `packages/types/tests/unit/ritus/schema.test.ts`). `@eldritchforgeworks/dtk-types`
   bumped to 0.2.0.

These were split into their own change at triage: `ritus-tier-vocabulary`.
