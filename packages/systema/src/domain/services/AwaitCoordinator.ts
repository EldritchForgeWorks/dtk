import type { ICombatStateStore } from '../../ports/ICombatStateStore.js'
import type { ISocketRelay } from '../../ports/ISocketRelay.js'
import type { IActionExecutor } from '../../ports/IActionExecutor.js'
import type { IActorRepository } from '../../ports/IActorRepository.js'
import { PendingDecision } from '../entities/PendingDecision.js'
import type { Choice } from '../entities/PendingDecision.js'

export interface AwaitPayload {
  sequenceId: string
  stepId: string
  choices: Choice[]
  actorId: string
  timeout?: number
  default?: string
}

export class AwaitCoordinator {
  constructor(
    private readonly store: ICombatStateStore,
    private readonly socket: ISocketRelay,
    private readonly executor: IActionExecutor,
    private readonly repo: IActorRepository,
    private readonly renderDecision: (decision: PendingDecision) => void,
  ) {}

  async handleAwait(payload: AwaitPayload, now: number): Promise<void> {
    const decision = new PendingDecision({
      sequenceId: payload.sequenceId,
      stepId: payload.stepId,
      choices: payload.choices,
      actorId: payload.actorId,
      pendingAt: now,
      timeout: payload.timeout ?? null,
      defaultChoice: payload.default ?? null,
    })

    await this.store.writePending(payload.sequenceId, decision.toPayload())

    const isGm = this.socket.isGM()
    const isOwned = this.repo.isOwnedByCurrentUser(payload.actorId)

    if (isGm && isOwned) {
      this.renderDecision(decision)
    } else if (isGm && !isOwned) {
      this.socket.send('dtk-systema.decision-relay', {
        actorId: payload.actorId,
        sequenceId: payload.sequenceId,
        stepId: payload.stepId,
        choices: payload.choices,
        timeout: payload.timeout,
        default: payload.default,
      })
    } else if (!isGm && isOwned) {
      this.socket.send('dtk-systema.decision-request', {
        actorId: payload.actorId,
        sequenceId: payload.sequenceId,
        stepId: payload.stepId,
        choices: payload.choices,
        timeout: payload.timeout,
        default: payload.default,
      })
    }
  }

  async handleResponse(sequenceId: string, choice: string): Promise<void> {
    await this.store.clearPending(sequenceId)
    await this.executor.resume(sequenceId, choice)
  }

  async recoverPending(now: number): Promise<void> {
    const all = this.store.readAllPending()
    for (const payload of all) {
      const decision = new PendingDecision(payload)
      if (decision.isExpired(now)) {
        await this.store.clearPending(payload.sequenceId)
      } else if (this.repo.isOwnedByCurrentUser(payload.actorId)) {
        this.renderDecision(decision)
      }
    }
  }
}
