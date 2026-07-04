// Domain barrel — entities, services, value-objects. Zero Foundry imports.
// Published subpath: @eldritchforgeworks/dtk-alea/domain

export {
  SequenceExecution,
} from './entities/SequenceExecution.js';
export type {
  RollContext,
  SequenceExemplar,
  SequenceStep,
  RuleStep,
  AwaitStep,
  StepCondition,
  TierConsequence,
  SequenceExecutionSnapshot,
  SequenceStatus,
} from './entities/SequenceExecution.js';

export { ExpressionParser } from './services/ExpressionParser.js';
export { RollResolver } from './services/RollResolver.js';
export { SequenceExecutor } from './services/SequenceExecutor.js';
export { RitusRegistry } from './services/RitusRegistry.js';
export type { Ritus } from './services/RitusRegistry.js';
export { SequenceExemplarRegistry } from './services/SequenceExemplarRegistry.js';
export { classify } from './services/TierResolver.js';

export type { RitusConfig } from './value-objects/RitusConfig.js';
export { makeRollResult } from './value-objects/RollResult.js';
export type { RollResult } from './value-objects/RollResult.js';
export type { StepOutput } from './value-objects/StepOutput.js';
