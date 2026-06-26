import type { ActionLoader, ActionExemplar } from '../domain/services/ActionLoader.js'
import type { ConditionEvaluator } from '../domain/services/ConditionEvaluator.js'

interface ActionMenuContext {
  actions: Array<ActionExemplar & { available: boolean }>
}

export class ActionMenuApp {
  private pending = false
  rendered = false

  constructor(
    private readonly actorId: string,
    private readonly loader: ActionLoader,
    private readonly evaluator: ConditionEvaluator,
    private readonly onActionClick: (actionId: string, actorId: string) => void,
  ) {}

  render(force: boolean = false): void {
    if (!force && this.rendered) return
    this.rendered = true
    // In a real Foundry context this would call ApplicationV2 render
  }

  close(): void {
    this.rendered = false
  }

  protected prepareContext(): ActionMenuContext {
    const exemplars = this.loader.load(this.actorId)
    const actions = exemplars.map((action) => ({
      ...action,
      available: this.evaluator.evaluate(action.condition ?? 'true', {
        actor: {},
      }),
    }))
    return { actions }
  }

  handleClick(actionId: string): void {
    if (this.pending) return
    this.pending = true
    this.onActionClick(actionId, this.actorId)
  }
}
