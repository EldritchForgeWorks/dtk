// Foundry module entry point — requires live Foundry VTT environment.
// This file is excluded from unit test coverage.

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const Hooks: any;
declare const game: any;

import { FormaRegistry } from './domain/FormaRegistry.js';
import { FoundryActorBuildStore } from './adapters/foundry/FoundryActorBuildStore.js';
import { FoundryExemplarQuery } from './adapters/foundry/FoundryExemplarQuery.js';
import { FoundryWizardRenderer } from './adapters/foundry/FoundryWizardRenderer.js';
import { FoundryTrackerRenderer } from './adapters/foundry/FoundryTrackerRenderer.js';
import { OpusApi } from './adapters/foundry/OpusApi.js';

const MODULE_ID = 'dtk-opus';
const VERSION = '0.1.0';

Hooks.once('init', () => {
  const registry = new FormaRegistry();
  const store = new FoundryActorBuildStore();
  const exemplarQuery = new FoundryExemplarQuery();
  const wizardRenderer = new FoundryWizardRenderer();
  const trackerRenderer = new FoundryTrackerRenderer();

  const api = new OpusApi(registry, store, exemplarQuery, wizardRenderer, trackerRenderer);

  const dtk = (game as { dtk?: { register?: (entry: unknown) => void } }).dtk;
  dtk?.register?.({ id: MODULE_ID, version: VERSION, api });

  api.isReady = true;
  Hooks.callAll('dtk-opus.ready');
  console.log('[DTK] dtk-opus initialized');
});
