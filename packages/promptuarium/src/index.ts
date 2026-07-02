// Foundry module entry point — requires live Foundry VTT environment.
// This file is excluded from unit test coverage.

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const Hooks: any;
declare const game: any;

const MODULE_ID = 'dtk-promptuarium';
const VERSION = '0.1.0';

Hooks.once('init', () => {
  const dtk = (game as { dtk?: { register?: (entry: unknown) => void } }).dtk;
  dtk?.register?.({ id: MODULE_ID, version: VERSION, api: {} });
  Hooks.callAll('dtk-promptuarium.ready');
  console.log('[DTK] dtk-promptuarium initialized');
});
