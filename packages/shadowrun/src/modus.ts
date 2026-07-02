import type { Modus } from '@eldritchforgeworks/dtk-types';
import { ShadowrunCharacterData } from './actors/ShadowrunCharacterData.js';

// dtk-shadowrun's Modus declaration — passed to
// game.dtk.getApi('dtk-systema').defineSystem(modus) during this module's own
// init hook. This makes dtk-shadowrun the reference consumer of defineSystem
// (see DTK openspec change add-define-system-smoke-test).
//
// NOTE 2026-07-02: this call site originally used game.dtk.api(...) (the
// stale @eldritchforgeworks/dtk-types hub-API type's method name), which does
// not exist on the real runtime hub (module/src/index.ts only implements
// getApi) — confirmed by reading the hub source directly. That bug made
// defineSystem() silently never run (systema?.defineSystem was always
// undefined, falling through to the "not available" warning), which the
// domain-level smoke test didn't catch because its fixture didn't model the
// real hub shape. Fixed to getApi; a real-hub-shaped fixture should be added
// to the smoke test to prevent this recurring.
//
// GAP (recorded, not fixed here — filed as follow-up change
// add-modus-sheet-declaration): Modus has no way to declare a Sheet class or
// sheetOptions today, so ShadowrunCharacterSheet registration still happens
// via Actors.registerSheet() directly in index.ts, outside of defineSystem().
export const shadowrunModus: Modus = {
  id: 'dtk-shadowrun',
  schemaVersion: 1,
  actors: {
    'dtk-shadowrun.shadowrunCharacter': {
      label: 'Shadowrun Character',
      dataModel: ShadowrunCharacterData,
    },
  },
};
