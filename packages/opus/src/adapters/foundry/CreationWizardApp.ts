// @ts-nocheck — references Foundry VTT globals unavailable in this compilation target
import type { Forma } from '../../domain/Forma'
import type { CharacterBuild } from '../../domain/CharacterBuild'
import type { CreationEngine } from '../../domain/CreationEngine'

export class CreationWizardApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static override DEFAULT_OPTIONS = {
    id: 'dtk-opus-creation-wizard',
    classes: ['dtk-opus', 'creation-wizard'],
    tag: 'dialog',
    window: { title: 'Character Creation', resizable: true },
    position: { width: 720, height: 600 },
  }

  static override PARTS = {
    header: { template: 'modules/dtk-opus/templates/wizard-header.hbs' },
    step: { template: 'modules/dtk-opus/templates/wizard-step.hbs' },
    footer: { template: 'modules/dtk-opus/templates/wizard-footer.hbs' },
  }

  private _resolve: ((build: CharacterBuild | null) => void) | null = null
  private _currentStepIndex = 0

  constructor(
    private _forma: Forma,
    private _engine: CreationEngine,
    options = {}
  ) {
    super(options)
  }

  get currentStep() {
    return this._forma.steps[this._currentStepIndex]
  }

  get canFinish() {
    return this._engine.canFinish()
  }

  open(): Promise<CharacterBuild | null> {
    return new Promise(resolve => {
      this._resolve = resolve
      this.render(true)
    })
  }

  override async _prepareContext() {
    const steps = this._forma.steps
    const current = steps[this._currentStepIndex]
    let exemplars = []
    if (current?.kind === 'choices') {
      exemplars = await this._engine.exemplarQuery.query(current.from)
    }
    return {
      steps,
      currentStep: current,
      currentStepIndex: this._currentStepIndex,
      totalSteps: steps.length,
      canGoBack: this._currentStepIndex > 0,
      canGoForward: this._currentStepIndex < steps.length - 1,
      canFinish: this._engine.canFinish(),
      exemplars,
      stepState: this._engine.getStepState(current?.id),
    }
  }

  override _onRender(context, options) {
    super._onRender(context, options)
    const el = this.element

    el.querySelector('[data-action="prev"]')?.addEventListener('click', () => {
      if (this._currentStepIndex > 0) {
        this._currentStepIndex--
        this.render()
      }
    })

    el.querySelector('[data-action="next"]')?.addEventListener('click', () => {
      if (this._currentStepIndex < this._forma.steps.length - 1) {
        this._currentStepIndex++
        this.render()
      }
    })

    el.querySelector('[data-action="finish"]')?.addEventListener('click', () => {
      if (!this._engine.canFinish()) return
      const build = this._engine.finish()
      this._resolve?.(build)
      this._resolve = null
      this.close()
    })

    el.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      this._resolve?.(null)
      this._resolve = null
      this.close()
    })

    el.querySelectorAll('[data-exemplar-id]').forEach(card => {
      card.addEventListener('click', () => {
        const step = this.currentStep
        if (step?.kind !== 'choices') return
        const id = card.dataset.exemplarId
        const current = this._engine.getStepState(step.id)
        if (step.max === 1) {
          this._engine.applyChoice(step.id, id)
        } else {
          const selected = Array.isArray(current) ? [...current] : []
          const idx = selected.indexOf(id)
          if (idx >= 0) {
            selected.splice(idx, 1)
          } else if (selected.length < step.max) {
            selected.push(id)
          }
          this._engine.applyChoice(step.id, selected)
        }
        this.render()
      })
    })

    el.querySelectorAll('[data-attr-id]').forEach(row => {
      const step = this.currentStep
      if (step?.kind !== 'point-buy') return
      row.querySelector('[data-action="increment"]')?.addEventListener('click', () => {
        const attrId = row.dataset.attrId
        const current = (this._engine.getStepState(step.id) as Record<string, number>) ?? {}
        const next = { ...current, [attrId]: (current[attrId] ?? 0) + 1 }
        try {
          this._engine.applyChoice(step.id, next)
          this.render()
        } catch { /* over-allocation */ }
      })
      row.querySelector('[data-action="decrement"]')?.addEventListener('click', () => {
        const attrId = row.dataset.attrId
        const current = (this._engine.getStepState(step.id) as Record<string, number>) ?? {}
        const next = { ...current, [attrId]: Math.max(0, (current[attrId] ?? 0) - 1) }
        this._engine.applyChoice(step.id, next)
        this.render()
      })
    })
  }

  override async close(options = {}) {
    if (this._resolve) {
      this._resolve(null)
      this._resolve = null
    }
    return super.close(options)
  }
}
