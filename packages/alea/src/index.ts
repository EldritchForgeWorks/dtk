// Foundry module entry point — requires live Foundry VTT environment.
// This file is excluded from unit test coverage.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Hooks: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const game: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const CONFIG: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Items: any;

import { FoundryDiceRoller } from './adapters/foundry/FoundryDiceRoller.js';
import { FoundryCombatStateStore } from './adapters/foundry/FoundryCombatStateStore.js';
import { FoundryHookEmitter } from './adapters/foundry/FoundryHookEmitter.js';
import { LexExpressionDelegate } from './adapters/foundry/LexExpressionDelegate.js';
import { FoundryActorRepository } from './adapters/foundry/FoundryActorRepository.js';
import { RitusDataModel } from './adapters/foundry/RitusDataModel.js';
import { SequenceDataModel } from './adapters/foundry/SequenceDataModel.js';
import { RitusSheet } from './adapters/foundry/RitusSheet.js';
import { SequenceSheet } from './adapters/foundry/SequenceSheet.js';
import { CompendiumScanner } from './adapters/foundry/CompendiumScanner.js';
import { RitusRegistry } from './domain/services/RitusRegistry.js';
import { SequenceExemplarRegistry } from './domain/services/SequenceExemplarRegistry.js';
import { ExpressionParser } from './domain/services/ExpressionParser.js';
import { RollResolver } from './domain/services/RollResolver.js';
import { SequenceExecutor } from './domain/services/SequenceExecutor.js';
import { createAleaApi } from './AleaApi.js';
import { makeCombatTurnHandler, makeCombatRoundHandler } from './combat/combatHandlers.js';

const MODULE_VERSION = '0.1.0';

// Hoisted to module scope so the `ready` hook can access them after `init` runs.
let registry: RitusRegistry;
let exemplarRegistry: SequenceExemplarRegistry;

Hooks.on('init', async () => {
  // Register item types FIRST so Foundry knows how to construct documents.
  CONFIG.Item.dataModels['dtk.ritus'] = RitusDataModel;
  CONFIG.Item.dataModels['dtk.sequence'] = SequenceDataModel;

  const roller = new FoundryDiceRoller();
  const store = new FoundryCombatStateStore();
  const emitter = new FoundryHookEmitter();
  const lexDelegate = new LexExpressionDelegate();
  const actorRepository = new FoundryActorRepository();

  registry = new RitusRegistry();
  exemplarRegistry = new SequenceExemplarRegistry();
  const parser = new ExpressionParser(lexDelegate);
  const resolver = new RollResolver(roller, parser, registry);
  const executor = new SequenceExecutor(resolver, store, emitter, registry, parser);

  const readyFlag = { value: false };
  const api = createAleaApi(registry, executor, readyFlag, exemplarRegistry, actorRepository);

  game.dtk.register({ id: 'dtk-alea', version: MODULE_VERSION, api });
  readyFlag.value = true;

  Items.registerSheet('dtk-alea', RitusSheet, {
    types: ['dtk.ritus'],
    makeDefault: true,
    label: 'DTK Ritus Sheet',
  });
  Items.registerSheet('dtk-alea', SequenceSheet, {
    types: ['dtk.sequence'],
    makeDefault: true,
    label: 'DTK Sequence Sheet',
  });

  Hooks.on('combatTurn', makeCombatTurnHandler(api, store));
  Hooks.on('combatRound', makeCombatRoundHandler(store));

  Hooks.callAll('dtk-alea.ready');
});

Hooks.on('ready', async () => {
  const scanner = new CompendiumScanner(registry, exemplarRegistry);
  await scanner.scanAll();
});
