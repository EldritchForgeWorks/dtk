// Ports barrel — the five port interfaces domain services depend on.
// Published subpath: @eldritchforgeworks/dtk-alea/ports

export type { IActorRepository } from './IActorRepository.js';
export type { ICombatStateStore } from './ICombatStateStore.js';
export type { IDiceRoller, DiceResult, RollOpts } from './IDiceRoller.js';
export type {
  IExpressionDelegate,
  EvaluationContext,
  ActorSnapshot,
  ItemSnapshot,
  CombatSnapshot,
} from './IExpressionDelegate.js';
export type { IHookEmitter } from './IHookEmitter.js';
