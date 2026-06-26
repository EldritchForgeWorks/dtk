// @ts-nocheck — references Foundry VTT globals unavailable in this compilation target
import type { Forma } from '../../domain/Forma'
import type { CharacterBuild } from '../../domain/CharacterBuild'
import type { IActorBuildStore } from '../../ports/IActorBuildStore'
import { AdvancementEngine } from '../../domain/AdvancementEngine'
import { PrerequisiteEvaluator } from '../../domain/PrerequisiteEvaluator'
import { LexDelegateAdapter } from './LexDelegateAdapter'

export class AdvancementTrackerApp extends ApplicationV2 {
  static override DEFAULT_OPTIONS = {
    id: 'dtk-opus-advancement-tracker',
    classes: ['dtk-opus', 'advancement-tracker'],
    tag: 'aside',
    window: { title: 'Advancement Tracker', resizable: true },
    position: { width: 400, height: 600 },
  }

  static override PARTS = {
    header: { template: 'modules/dtk-opus/templates/tracker-header.hbs' },
    advancements: { template: 'modules/dtk-opus/templates/tracker-advancements.hbs' },
  }

  private _engine: AdvancementEngine

  constructor(
    private _actor: { id: string },
    private _forma: Forma,
    private _build: CharacterBuild,
    private _store: IActorBuildStore,
    options = {}
  ) {
    super(options)
    const lexDelegate = new LexDelegateAdapter()
    const evaluator = new PrerequisiteEvaluator(lexDelegate)
    this._engine = new AdvancementEngine(evaluator)
  }

  private get _paradigmSummary(): string {
    const state = this._build.paradigmState
    switch (state.paradigm) {
      case 'xp':
      case 'marks':
        return `${state.currency} Spent: ${state.spent} / ${state.total}`
      case 'milestone':
      case 'session':
        return `Advancements Available: ${state.advancementsRemaining}`
      case 'resource':
        return `${state.currency}: (live)`
      case 'practice': {
        const practisedCount = Object.values(state.practiceLog).filter(v => v > 0).length
        return `Session Practice Log: ${practisedCount} abilities marked`
      }
    }
  }

  override async _prepareContext() {
    const entries = this._engine.availableAdvancements(this._forma, this._build)
    return {
      paradigmSummary: this._paradigmSummary,
      entries,
    }
  }

  override _onRender(context, options) {
    super._onRender(context, options)
    const el = this.element
    el.querySelectorAll('[data-action="buy"][data-advancement-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const advId = btn.dataset.advancementId
        try {
          const updated = this._engine.purchase(this._forma, this._build, advId, Date.now())
          this._build = updated
          await this._store.set(this._actor.id, updated)
          this.render()
        } catch {
          ui.notifications?.warn(`Cannot purchase advancement: ${advId}`)
        }
      })
    })
  }
}
