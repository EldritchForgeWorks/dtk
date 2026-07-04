// In-memory adapters barrel — test doubles implementing every port.
// Published subpath: @eldritchforgeworks/dtk-alea/adapters/in-memory

export { DeterministicDiceRoller } from './DeterministicDiceRoller.js';
export { InMemoryActorRepository } from './InMemoryActorRepository.js';
export { InMemoryCombatStateStore } from './InMemoryCombatStateStore.js';
export { NullExpressionDelegate } from './NullExpressionDelegate.js';
export { SpyHookEmitter } from './SpyHookEmitter.js';
export type { HookCall } from './SpyHookEmitter.js';
