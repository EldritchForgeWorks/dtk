import type { Forma, FormaStep } from './Forma'
import type { CharacterBuild } from './CharacterBuild'
import type { IExemplarQuery } from '../ports/IExemplarQuery'
import { initialParadigmState } from './CharacterBuild'

function evaluatePool(pool: string, state: Record<string, unknown>): number {
  const num = Number(pool)
  if (!isNaN(num)) return num

  let expr = pool.replace(/@(\w+)\.(\w+)/g, (_match, stepId: string, field: string) => {
    const stepVal = state[stepId]
    if (stepVal === null || stepVal === undefined) return '0'
    if (typeof stepVal === 'object') {
      const val = (stepVal as Record<string, unknown>)[field]
      return String(Number(val) || 0)
    }
    return '0'
  })

  if (/^[\d\s+\-*/().]+$/.test(expr)) {
    try {
      // eslint-disable-next-line no-new-func
      return (new Function(`"use strict"; return (${expr})`))() as number
    } catch {
      return 0
    }
  }
  return 0
}

export class CreationEngine {
  private state: Record<string, unknown> = {}

  constructor(
    private forma: Forma,
    readonly exemplarQuery: IExemplarQuery
  ) {}

  steps(): FormaStep[] {
    return this.forma.steps
  }

  applyChoice(stepId: string, choice: unknown): void {
    const step = this.forma.steps.find(s => s.id === stepId)
    if (!step) {
      throw new Error(`dtk-opus: unknown step id "${stepId}"`)
    }

    if (step.kind === 'choices') {
      if (Array.isArray(choice) && choice.length > step.max) {
        throw new Error(
          `dtk-opus: step "${stepId}" allows max ${step.max} choices, got ${choice.length}`
        )
      }
      this.state[stepId] = choice
    } else if (step.kind === 'point-buy') {
      const allocation = choice as Record<string, number>
      const total = Object.values(allocation).reduce(
        (sum, v) => sum + (Number(v) || 0),
        0
      )
      const pool = evaluatePool(step.pool, this.state)
      if (total > pool) {
        throw new Error(`dtk-opus: point-buy over-allocation: ${total} > ${pool}`)
      }
      this.state[stepId] = choice
    } else {
      this.state[stepId] = choice
    }
  }

  getStepState(stepId: string): unknown {
    return this.state[stepId]
  }

  canFinish(): boolean {
    return this.forma.steps
      .filter(s => s.required !== false)
      .every(s => this.state[s.id] !== undefined && this.state[s.id] !== null)
  }

  finish(): CharacterBuild {
    if (!this.canFinish()) {
      throw new Error('dtk-opus: cannot finish — not all required steps are complete')
    }
    return {
      systemId: this.forma.systemId,
      steps: { ...this.state },
      advancements: [],
      paradigmState: initialParadigmState(this.forma.advancement),
    }
  }

  cancel(): null {
    return null
  }
}
