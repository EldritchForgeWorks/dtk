// Foundry module entry point — requires live Foundry VTT environment.
// This file is excluded from unit test coverage.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Hooks: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const game: any;

import { FoundryDiceRoller } from './adapters/foundry/FoundryDiceRoller.js';
import { FoundryCombatStateStore } from './adapters/foundry/FoundryCombatStateStore.js';
import { FoundryHookEmitter } from './adapters/foundry/FoundryHookEmitter.js';
import { LexExpressionDelegate } from './adapters/foundry/LexExpressionDelegate.js';
import { RitusRegistry } from './domain/services/RitusRegistry.js';
import { ExpressionParser } from './domain/services/ExpressionParser.js';
import { RollResolver } from './domain/services/RollResolver.js';
import { SequenceExecutor } from './domain/services/SequenceExecutor.js';
import { createAleaApi } from './AleaApi.js';
import { makeCombatTurnHandler, makeCombatRoundHandler } from './combat/combatHandlers.js';

const MODULE_VERSION = '0.1.0';

Hooks.on('init', async () => {
  const roller = new FoundryDiceRoller();
  const store = new FoundryCombatStateStore();
  const emitter = new FoundryHookEmitter();
  const lexDelegate = new LexExpressionDelegate();

  const registry = new RitusRegistry();
  const parser = new ExpressionParser(lexDelegate);
  const resolver = new RollResolver(roller, parser);
  const executor = new SequenceExecutor(resolver, store, emitter, registry, parser);

  const readyFlag = { value: false };
  const api = createAleaApi(registry, executor, readyFlag);

  game.dtk.register({ id: 'dtk-alea', version: MODULE_VERSION, api });
  readyFlag.value = true;

  Hooks.on('combatTurn', makeCombatTurnHandler(api, store));
  Hooks.on('combatRound', makeCombatRoundHandler(store));

  Hooks.callAll('dtk-alea.ready');
});
