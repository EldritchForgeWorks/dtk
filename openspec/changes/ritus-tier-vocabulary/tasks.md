## 1. Types: free tier vocabulary

- [x] 1.1 [test] Rewrite tier tests: fixed-triple ordering tests removed; new coverage for free vocab, slug key rule, threshold uniqueness, at-least-one, and shadowrun vocabulary `{miss:0,hit:1,strong:4,exceptional:6}` lossless round-trip regression
- [x] 1.2 [impl] `RitusTiersSchema` → `z.record` with slug keys (`/^[a-z][a-z0-9-]*$/`), nonnegative-integer values, superRefine (≥1 entry, unique threshold values); delete ordering refinement; export `RitusTiers = Readonly<Record<string, number>>`
- [x] 1.3 [impl] `.strict()` on RitusSchema's inner object (before superRefine/transform); test that an unknown key fails loudly
- [x] 1.4 [impl] Bump `@eldritchforgeworks/dtk-types` to 0.2.0 (no publish)

## 2. Shadowrun pack data

- [x] 2.1 Remove `keepMode: ""` from `packages/shadowrun/src/packs/sr-ritus/SR6DicePool.json`
- [x] 2.2 Rebuild packs (`npm run build:packs`) and commit the rebuilt artifacts

## 3. Consumer fallout

- [x] 3.1 Fix any compile breakage in alea/systema — mechanical adaptation only

## 4. Verification

- [x] 4.1 types build + full test suite green
- [x] 4.2 alea build + tests green; systema build + tests green; shadowrun build + build:packs green
- [x] 4.3 Mark both findings resolved in `openspec/changes/fix-promptuarium-compile-mapping/OFFICINA-FINDINGS.md`

## Notes

- Consumer audit before implementation: alea already models tiers as
  `Record<string, number>` (`RitusConfig`, `TierResolver`, `RitusRegistry`,
  `CompendiumScanner`, `RitusSheet`) and does not import `RitusTiers`; systema
  never touches tiers. No consumer depended on the fixed triple semantics.
