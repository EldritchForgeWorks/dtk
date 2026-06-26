export interface Choice {
  readonly id: string
  readonly label: string
}

export interface PendingDecisionPayload {
  readonly sequenceId: string
  readonly stepId: string
  readonly choices: readonly Choice[]
  readonly actorId: string
  readonly pendingAt: number
  readonly timeout: number | null
  readonly defaultChoice: string | null
}

export class PendingDecision {
  readonly sequenceId: string
  readonly stepId: string
  readonly choices: readonly Choice[]
  readonly actorId: string
  readonly pendingAt: number
  readonly timeout: number | null
  readonly defaultChoice: string | null

  constructor(payload: PendingDecisionPayload) {
    this.sequenceId = payload.sequenceId
    this.stepId = payload.stepId
    this.choices = payload.choices
    this.actorId = payload.actorId
    this.pendingAt = payload.pendingAt
    this.timeout = payload.timeout
    this.defaultChoice = payload.defaultChoice
  }

  isExpired(now: number): boolean {
    if (this.timeout === null) return false
    return this.pendingAt + this.timeout <= now
  }

  resolveDefault(): string | null {
    return this.defaultChoice
  }

  toPayload(): PendingDecisionPayload {
    return {
      sequenceId: this.sequenceId,
      stepId: this.stepId,
      choices: this.choices,
      actorId: this.actorId,
      pendingAt: this.pendingAt,
      timeout: this.timeout,
      defaultChoice: this.defaultChoice,
    }
  }
}
