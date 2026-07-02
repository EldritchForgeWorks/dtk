// Minimal Foundry VTT global stub for the test environment. dtk-shadowrun's
// source files are Foundry adapters (see index.ts/ShadowrunCharacterData.ts
// comments: "requires live Foundry VTT environment") that reference `foundry`
// at class-definition time (`extends foundry.abstract.TypeDataModel`). This
// stub only needs to satisfy import-time evaluation — tests here validate
// the Modus *declaration* (a domain-level concern), not Foundry's runtime
// DataModel behaviour, which is covered by the manual Foundry smoke checklist.
;(globalThis as unknown as { foundry: unknown }).foundry = {
  abstract: {
    TypeDataModel: class {},
  },
}
