import type { RollContext } from './domain/entities/SequenceExecution.js';
import type { Ritus } from './domain/services/RitusRegistry.js';
import { RitusRegistry } from './domain/services/RitusRegistry.js';
import { SequenceExecutor } from './domain/services/SequenceExecutor.js';

export interface AleaApi {
  registerRitus(ritus: Ritus): void;
  execute(context: RollContext): Promise<void>;
  resume(sequenceId: string, choice: unknown): Promise<void>;
  isReady(): boolean;
}

export function createAleaApi(
  registry: RitusRegistry,
  executor: SequenceExecutor,
  readyFlag: { value: boolean },
): AleaApi {
  return {
    registerRitus(ritus: Ritus): void {
      registry.register(ritus);
    },
    async execute(context: RollContext): Promise<void> {
      await executor.execute(context);
    },
    async resume(sequenceId: string, choice: unknown): Promise<void> {
      await executor.resume(sequenceId, choice);
    },
    isReady(): boolean {
      return readyFlag.value;
    },
  };
}
