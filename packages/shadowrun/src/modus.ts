import type { Modus } from '@eldritchforgeworks/dtk-types';
import { ShadowrunCharacterData } from './actors/ShadowrunCharacterData.js';

// dtk-shadowrun's Modus declaration — passed to
// game.dtk.api('dtk-systema').defineSystem(modus) during this module's own
// init hook. This makes dtk-shadowrun the reference consumer of defineSystem
// (see DTK openspec change add-define-system-smoke-test).
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
