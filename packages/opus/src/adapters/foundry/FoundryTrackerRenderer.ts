// @ts-nocheck — references Foundry VTT globals unavailable in this compilation target
import type { ITrackerRenderer } from '../../ports/ITrackerRenderer'
import type { Forma } from '../../domain/Forma'
import type { CharacterBuild } from '../../domain/CharacterBuild'
import type { IActorBuildStore } from '../../ports/IActorBuildStore'
import { AdvancementTrackerApp } from './AdvancementTrackerApp'

const _openTrackers = new Map<string, AdvancementTrackerApp>()

export class FoundryTrackerRenderer implements ITrackerRenderer {
  constructor(private store: IActorBuildStore) {}

  open(actor: { id: string }, forma: Forma, build: CharacterBuild): void {
    const existing = _openTrackers.get(actor.id)
    if (existing) {
      existing.bringToTop?.()
      return
    }
    const app = new AdvancementTrackerApp(actor, forma, build, this.store)
    _openTrackers.set(actor.id, app)
    app.render(true)
    // clean up on close
    const origClose = app.close.bind(app)
    app.close = async (options) => {
      _openTrackers.delete(actor.id)
      return origClose(options)
    }
  }
}
