// Minimal Foundry VTT global stub for the test environment. dtk-shadowrun's
// source files are Foundry adapters (see index.ts/ShadowrunCharacterData.ts
// comments: "requires live Foundry VTT environment") that reference `foundry`
// at class-definition time (`extends foundry.abstract.TypeDataModel`, and
// `extends foundry.applications.api.HandlebarsApplicationMixin(
// foundry.applications.api.DocumentSheetV2)` for the sheet class). This stub
// only needs to satisfy import-time evaluation — tests here validate the
// Modus *declaration* and the init-hook's hub-accessor call (domain-level
// concerns), not Foundry's runtime rendering/DataModel behaviour, which is
// covered by the manual Foundry smoke checklist.
;(globalThis as unknown as { foundry: unknown }).foundry = {
  abstract: {
    TypeDataModel: class {},
  },
  applications: {
    api: {
      HandlebarsApplicationMixin: (Base: new (...args: unknown[]) => unknown) =>
        class extends Base {},
      DocumentSheetV2: class {},
    },
  },
}

// registerTheme() (called at module top-level in index.ts) touches
// document.documentElement.classList — a bare classList stub is enough.
;(globalThis as unknown as { document: unknown }).document = {
  documentElement: { classList: { add: () => {}, remove: () => {} } },
}
