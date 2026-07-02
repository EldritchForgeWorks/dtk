// Foundry module entry point — requires live Foundry VTT environment.
// This file is excluded from unit test coverage.

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const Hooks: any;
declare const game: any;
declare const CONFIG: any;
declare const Items: any;

import { CodexRegistry } from './domain/CodexRegistry.js';
import { ExpressionEngine } from './domain/ExpressionEngine.js';
import { ConditionEvaluator } from './domain/ConditionEvaluator.js';
import { LexApi } from './domain/LexApi.js';
import { NullEditorRenderer } from './adapters/in-memory/NullEditorRenderer.js';
import { CodexEntryDataModel } from './adapters/foundry/CodexEntryDataModel.js';
import { CodexEntrySheet } from './adapters/foundry/CodexEntrySheet.js';
import { CompendiumScanner } from './adapters/foundry/CompendiumScanner.js';

const MODULE_ID = 'dtk-lex';
const VERSION = '0.1.0';

// Hoisted so the `ready` hook can access the same instance `init` built.
let registry: CodexRegistry;

Hooks.once('init', () => {
  CONFIG.Item.dataModels['dtk.codex-entry'] = CodexEntryDataModel;

  Items.registerSheet('dtk-lex', CodexEntrySheet, {
    types: ['dtk.codex-entry'],
    makeDefault: true,
    label: 'DTK Codex Entry Sheet',
  });

  registry = new CodexRegistry();
  const engine = new ExpressionEngine();
  const evaluator = new ConditionEvaluator(registry, engine);
  const editor = new NullEditorRenderer();

  const api = new LexApi({ registry, engine, evaluator, editor });

  const dtk = (game as { dtk?: { register?: (entry: unknown) => void } }).dtk;
  dtk?.register?.({ id: MODULE_ID, version: VERSION, api });

  api.markReady();
  Hooks.callAll('dtk-lex.ready');
  console.log('[DTK] dtk-lex initialized');
});

Hooks.on('ready', async () => {
  const scanner = new CompendiumScanner(registry);
  await scanner.scanAll();
});
