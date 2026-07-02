import type { RollContext } from './domain/entities/SequenceExecution.js';
import type { Ritus } from './domain/services/RitusRegistry.js';
import { RitusRegistry } from './domain/services/RitusRegistry.js';
import { SequenceExecutor } from './domain/services/SequenceExecutor.js';
import { SequenceExemplarRegistry } from './domain/services/SequenceExemplarRegistry.js';
import type { IActorRepository } from './ports/IActorRepository.js';
import type { ActorSnapshot } from './ports/IExpressionDelegate.js';

export interface AleaApi {
  registerRitus(ritus: Ritus): void;
  execute(context: RollContext): Promise<void>;
  executeByRef(uuid: string, actorId: string, targetIds: string[]): Promise<void>;
  executeBySystemId(systemId: string, actorId: string, targetIds: string[]): Promise<void>;
  resume(sequenceId: string, choice: unknown): Promise<void>;
  isReady(): boolean;
}

export function createAleaApi(
  registry: RitusRegistry,
  executor: SequenceExecutor,
  readyFlag: { value: boolean },
  exemplarRegistry: SequenceExemplarRegistry,
  actorRepository: IActorRepository,
): AleaApi {
  return {
    registerRitus(ritus: Ritus): void {
      registry.register(ritus);
    },
    async execute(context: RollContext): Promise<void> {
      await executor.execute(context);
    },
    async executeByRef(uuid: string, actorId: string, targetIds: string[]): Promise<void> {
      const exemplar = exemplarRegistry.getByUUID(uuid);
      if (!exemplar) {
        throw new Error(`AleaApi.executeByRef: no SequenceExemplar registered for UUID "${uuid}".`);
      }

      const initiator = actorRepository.getSnapshot(actorId);
      if (!initiator) {
        throw new Error(`AleaApi.executeByRef: no actor found for ID "${actorId}".`);
      }

      const targets = targetIds
        .map((id) => actorRepository.getSnapshot(id))
        .filter((snapshot): snapshot is ActorSnapshot => snapshot !== null);

      const context: RollContext = {
        systemId: exemplar.systemId,
        sequenceExemplarId: exemplar.id,
        sequenceExemplar: exemplar,
        initiator,
        targets,
        item: null,
        combat: null,
      };

      await executor.execute(context);
    },
    async executeBySystemId(systemId: string, actorId: string, targetIds: string[]): Promise<void> {
      const exemplar = exemplarRegistry.getBySystemId(systemId);
      if (!exemplar) {
        throw new Error(`AleaApi.executeBySystemId: no sequence found with id "${systemId}".`);
      }

      const initiator = actorRepository.getSnapshot(actorId);
      if (!initiator) {
        throw new Error(`AleaApi.executeBySystemId: no actor found for ID "${actorId}".`);
      }

      const targets = targetIds
        .map((id) => actorRepository.getSnapshot(id))
        .filter((snapshot): snapshot is ActorSnapshot => snapshot !== null);

      const context: RollContext = {
        systemId: exemplar.systemId,
        sequenceExemplarId: exemplar.id,
        sequenceExemplar: exemplar,
        initiator,
        targets,
        item: null,
        combat: null,
      };

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
