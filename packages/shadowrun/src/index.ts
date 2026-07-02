import '../styles/index.css';

import { registerTheme } from './registerTheme.js';
import { ShadowrunCharacterData } from './actors/ShadowrunCharacterData.js';
import { ShadowrunCharacterSheet } from './actors/ShadowrunCharacterSheet.js';
import { listenForDiceStep } from './chat/renderDiceCard.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const Hooks: any;
declare const CONFIG: any;
declare const Actors: any;

// Apply cyberpunk theme immediately — before Foundry's init hook fires.
registerTheme();

Hooks.on('init', () => {
  CONFIG.Actor.dataModels['dtk-shadowrun.shadowrunCharacter'] = ShadowrunCharacterData;

  Actors.registerSheet('dtk-shadowrun', ShadowrunCharacterSheet, {
    types: ['dtk-shadowrun.shadowrunCharacter'],
    makeDefault: true,
    label: 'Shadowrun Character Sheet',
  });

  listenForDiceStep();
});
