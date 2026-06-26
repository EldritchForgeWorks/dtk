// @ts-nocheck — references Foundry VTT globals unavailable in this compilation target
import type { Forma } from '../../domain/Forma'
import type { CharacterBuild, ParadigmState } from '../../domain/CharacterBuild'
import type { IActorBuildStore } from '../../ports/IActorBuildStore'
import type { IWizardRenderer } from '../../ports/IWizardRenderer'
import type { ITrackerRenderer } from '../../ports/ITrackerRenderer'
import type { IExemplarQuery } from '../../ports/IExemplarQuery'
import { FormaRegistry } from '../../domain/FormaRegistry'
import { CreationEngine } from '../../domain/CreationEngine'
import { PrerequisiteEvaluator } from '../../domain/PrerequisiteEvaluator'
import { AdvancementEngine } from '../../domain/AdvancementEngine'
import { LexDelegateAdapter } from './LexDelegateAdapter'

export class OpusApi {
  isReady = false

  constructor(
    private registry: FormaRegistry,
    private store: IActorBuildStore,
    private exemplarQuery: IExemplarQuery,
    private wizardRenderer: IWizardRenderer,
    private trackerRenderer: ITrackerRenderer
  ) {}

  registerForma(systemId: string, forma: Forma): void {
    this.registry.register(systemId, forma)
  }

  async openCreationWizard(actor: { id: string }, systemId: string): Promise<CharacterBuild | null> {
    const forma = this.registry.get(systemId)
    if (!forma) {
      throw new Error(`dtk-opus: no Forma registered for system "${systemId}"`)
    }
    const lexDelegate = new LexDelegateAdapter()
    const evaluator = new PrerequisiteEvaluator(lexDelegate)
    const engine = new CreationEngine(forma, this.exemplarQuery)
    void evaluator
    return this.wizardRenderer.open(actor, forma, engine)
  }

  openAdvancementTracker(actor: { id: string }): void {
    const build = this.store.get(actor.id)
    if (!build) {
      throw new Error(`dtk-opus: actor "${actor.id}" has no dtk-opus build`)
    }
    const forma = this.registry.get(build.systemId)
    if (!forma) {
      throw new Error(`dtk-opus: no Forma registered for system "${build.systemId}"`)
    }
    this.trackerRenderer.open(actor, forma, build)
  }

  getBuild(actor: { flags?: Record<string, unknown> }): CharacterBuild | null {
    const flags = actor?.flags?.['dtk-opus'] as Record<string, unknown> | undefined
    const build = flags?.['build']
    if (!build || typeof build !== 'object') return null
    if (!('systemId' in build) || !('steps' in build) || !('advancements' in build)) return null
    return build as CharacterBuild
  }

  triggerMilestone(actorOrAll: { id: string } | 'all'): void {
    if (!game.user?.isGM) {
      throw new Error('dtk-opus: triggerMilestone is GM-only')
    }

    const targets =
      actorOrAll === 'all'
        ? Array.from(game.actors ?? [])
        : [game.actors?.get((actorOrAll as { id: string }).id)].filter(Boolean)

    for (const actor of targets) {
      if (!actor) continue
      const build = this.store.get(actor.id)
      if (!build) continue
      const forma = this.registry.get(build.systemId)
      if (!forma) continue

      const state = build.paradigmState
      let updated: ParadigmState | null = null

      if (state.paradigm === 'milestone' && forma.advancement.paradigm === 'milestone') {
        updated = {
          ...state,
          milestonesGranted: state.milestonesGranted + 1,
          advancementsRemaining:
            state.advancementsRemaining + forma.advancement.per_milestone,
        }
      } else if (state.paradigm === 'session' && forma.advancement.paradigm === 'session') {
        const sessionsCompleted = state.sessionsCompleted + 1
        const sessionsPerAdvance = forma.advancement.sessions_per_advance
        const advancementsRemaining =
          state.advancementsRemaining +
          Math.floor(sessionsCompleted / sessionsPerAdvance) -
          Math.floor((sessionsCompleted - 1) / sessionsPerAdvance)
        updated = { ...state, sessionsCompleted, advancementsRemaining }
      }

      if (updated) {
        const updatedBuild: CharacterBuild = { ...build, paradigmState: updated }
        void this.store.set(actor.id, updatedBuild)
      }
    }
  }

  private _makeAdvancementEngine(): AdvancementEngine {
    const lexDelegate = new LexDelegateAdapter()
    const evaluator = new PrerequisiteEvaluator(lexDelegate)
    return new AdvancementEngine(evaluator)
  }

  onSessionEnd(): void {
    if (!game.actors) return
    for (const actor of game.actors) {
      const build = this.store.get(actor.id)
      if (!build) continue
      const forma = this.registry.get(build.systemId)
      if (!forma || forma.advancement.paradigm !== 'practice') continue

      const state = build.paradigmState
      if (state.paradigm !== 'practice') continue

      const engine = this._makeAdvancementEngine()
      let currentBuild = build

      for (const track of forma.advancement.tracks) {
        try {
          if (engine.canBuy(forma, currentBuild, track.id)) {
            currentBuild = engine.purchase(forma, currentBuild, track.id, Date.now())
          }
        } catch {
          // track not purchasable, skip
        }
      }

      const resetBuild: CharacterBuild = {
        ...currentBuild,
        paradigmState: { paradigm: 'practice', practiceLog: {} },
      }
      void this.store.set(actor.id, resetBuild)
    }
  }
}
