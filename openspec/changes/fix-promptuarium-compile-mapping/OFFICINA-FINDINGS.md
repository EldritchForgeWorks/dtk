# Additional contract-drift findings (from Officina golden tests, 2026-07-02)

Found while building Officina's dtk-types golden fixtures against the published
`@eldritchforgeworks/dtk-types@0.1.0` schemas and the shipped shadowrun pack
content (`packages/shadowrun/src/packs/sr-ritus/SR6DicePool.json`). Pinned by
tests in the Officina repo (`packages/core/src/source-format/dtk-types-golden.test.ts`).

1. **`keepMode: ""` in the shipped SR6DicePool pack is rejected by RitusSchema**
   (enum allows only `'highest' | 'lowest'` or key absent). Either the pack
   should drop the key or the schema should tolerate `""`.

2. **Tiers vocabulary mismatch is silently destructive**: pack tiers
   `{miss, hit, strong, exceptional}` vs `RitusTiersSchema` `{critical?, hit, glancing?}`.
   Non-strict Zod parsing STRIPS the unknown keys without error — a Ritus
   round-tripped through the schema loses its tier definitions. Consider
   `.strict()` (loud failure) or a `z.record` tiers shape (accept custom
   vocabularies) — decide deliberately; both contracts can't stay as-is.

These belong to the same reconciliation effort as this change's pack-encoding
divergence; scope them here or split into their own change at triage.
