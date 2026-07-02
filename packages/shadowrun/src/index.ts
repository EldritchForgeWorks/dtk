import '../styles/index.css';

import { registerTheme } from './registerTheme.js';
import { ShadowrunCharacterSheet } from './actors/ShadowrunCharacterSheet.js';
import { listenForDiceStep } from './chat/renderDiceCard.js';
import { shadowrunModus } from './modus.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const Hooks: any;
declare const Actors: any;
declare const game: any;

// Apply cyberpunk theme immediately — before Foundry's init hook fires.
registerTheme();

Hooks.on('init', () => {
  // Reference consumer of dtk-systema's defineSystem() (see DTK openspec
  // change add-define-system-smoke-test). Registers the shadowrunCharacter
  // data model via the shared Modus path instead of assigning
  // CONFIG.Actor.dataModels directly.
  const systema = game.dtk?.api?.('dtk-systema') as
    | { defineSystem?: (modus: unknown) => void }
    | undefined;
  if (systema?.defineSystem) {
    systema.defineSystem(shadowrunModus);
  } else {
    console.warn('dtk-shadowrun: dtk-systema not available; character data model not registered');
  }

  // GAP: Modus cannot express a Sheet class yet (see add-modus-sheet-declaration
  // follow-up), so the sheet is still registered directly here.
  Actors.registerSheet('dtk-shadowrun', ShadowrunCharacterSheet, {
    types: ['dtk-shadowrun.shadowrunCharacter'],
    makeDefault: true,
    label: 'Shadowrun Character Sheet',
  });

  listenForDiceStep();
});
