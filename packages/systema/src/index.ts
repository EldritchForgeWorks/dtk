import { setInitWindowOpen, defineSystem } from './define-system/index.js'
import { createSystemaApi } from './registration/systema-api.js'
import { ActionMenuApp } from './action-menu/ActionMenuApp.js'
import { ActionLoader } from './domain/services/ActionLoader.js'
import { ConditionEvaluator } from './domain/services/ConditionEvaluator.js'
import { TargetingResolver } from './domain/services/TargetingResolver.js'
import { ContextBuilder } from './domain/services/ContextBuilder.js'
import { AwaitCoordinator } from './domain/services/AwaitCoordinator.js'
import { FoundryActorRepository } from './adapters/foundry/FoundryActorRepository.js'
import { FoundryCombatStateStore } from './adapters/foundry/FoundryCombatStateStore.js'
import { FoundrySocketRelay } from './adapters/foundry/FoundrySocketRelay.js'
import { FoundryTemplateManager } from './adapters/foundry/FoundryTemplateManager.js'
import { FoundryTargetListener } from './adapters/foundry/FoundryTargetListener.js'
import { InlineExpressionEvaluator } from './adapters/foundry/InlineExpressionEvaluator.js'
import { LexExpressionEvaluator } from './adapters/foundry/LexExpressionEvaluator.js'
import { AleaActionExecutor } from './adapters/foundry/AleaActionExecutor.js'
import { validateRollContext } from './domain/value-objects/RollContext.js'
import type { AwaitPayload } from './domain/services/AwaitCoordinator.js'

const MODULE_ID = 'dtk-systema'
const VERSION = '0.1.0'

let actorRepo: FoundryActorRepository
let combatStore: FoundryCombatStateStore
let socketRelay: FoundrySocketRelay
let templateMgr: FoundryTemplateManager
let awaitCoordinator: AwaitCoordinator
const openMenus = new Map<string, ActionMenuApp>()

Hooks.once('init', () => {
  setInitWindowOpen(true)

  actorRepo = new FoundryActorRepository()
  combatStore = new FoundryCombatStateStore()
  socketRelay = new FoundrySocketRelay()
  templateMgr = new FoundryTemplateManager()

  const lexEval = new LexExpressionEvaluator()

  const executor = new AleaActionExecutor()
  awaitCoordinator = new AwaitCoordinator(
    combatStore,
    socketRelay,
    executor,
    actorRepo,
    (_decision) => {
      // Decision dialog rendering — implemented in a future UI layer
    },
  )

  const api = createSystemaApi(VERSION, defineSystem)
  const dtk = (game as { dtk?: { register?: (entry: unknown) => void } }).dtk
  dtk?.register?.({ id: MODULE_ID, version: VERSION, api })

  socketRelay.onReceive('dtk-systema.decision-request', (payload: unknown) => {
    if (socketRelay.isGM()) {
      socketRelay.send('dtk-systema.decision-relay', payload)
    }
  })

  socketRelay.onReceive('dtk-systema.decision-response', async (payload: unknown) => {
    const p = payload as { sequenceId: string; choice: string }
    await awaitCoordinator.handleResponse(p.sequenceId, p.choice)
  })

  Hooks.on('dtk-alea.await', async (payload: unknown) => {
    await awaitCoordinator.handleAwait(payload as AwaitPayload, Date.now())
  })

  Hooks.on('controlToken', (...args: unknown[]) => {
    const t = args[0] as { actor?: { id?: string; flags?: Record<string, unknown> } }
    const controlled = args[1] as boolean
    const actorId = t.actor?.id
    if (!actorId) return

    if (!controlled) {
      openMenus.get(actorId)?.close()
      openMenus.delete(actorId)
      return
    }

    if (!t.actor?.flags?.['dtk-systema']) return

    const loader = new ActionLoader(actorRepo)
    const condEval = new ConditionEvaluator(lexEval)
    const app = new ActionMenuApp(actorId, loader, condEval, (id, aId) => {
      void handleActionClick(id, aId)
    })
    openMenus.set(actorId, app)
    app.render(true)
  })

  Hooks.on('updateActor', (actor: unknown) => {
    const a = actor as { id?: string }
    if (!a.id) return
    const menu = openMenus.get(a.id)
    if (menu?.rendered) menu.render()
  })

  api._markReady()
  Hooks.callAll('dtk-systema.ready')
  // NOTE: the init window intentionally stays open past this point. Foundry
  // dispatches Hooks.callAll('init') synchronously to every registered
  // listener in module-load order; dtk-systema's own listener runs first
  // (consumers require it), so closing the window here would make it closed
  // before any consumer's own Hooks.on('init') handler ever runs, i.e.
  // defineSystem() would be unusable by every real external caller. The
  // window is closed at 'ready' instead, once the whole init phase (systema
  // + all consumers) has completed.
})

Hooks.once('ready', async () => {
  setInitWindowOpen(false)
  await awaitCoordinator.recoverPending(Date.now())
})

async function handleActionClick(actionId: string, actorId: string): Promise<void> {
  const loader = new ActionLoader(actorRepo)
  const actions = loader.load(actorId)
  const action = actions.find((a) => a.id === actionId)
  if (!action) return

  const inlineEval = new InlineExpressionEvaluator()
  const listener = new FoundryTargetListener()
  const resolver = new TargetingResolver(actorRepo, templateMgr, inlineEval, listener)

  const targets = await resolver.resolve({
    mode: action.targetingMode,
    initiatorActorId: actorId,
  })

  const builder = new ContextBuilder(actorRepo, combatStore)
  const ctx = builder.build({
    initiatorActorId: actorId,
    targets,
    actionId,
    itemId: null,
  })

  if (!validateRollContext(ctx)) {
    ui.notifications?.error('DTK: Failed to assemble action context.')
    return
  }

  const executor = new AleaActionExecutor()
  if (!executor.isAvailable()) {
    console.warn('dtk-systema: dtk-alea not installed; action not executed')
    return
  }

  if (action.executionMode === 'per-target') {
    for (const target of targets) {
      const singleCtx = builder.build({
        initiatorActorId: actorId,
        targets: [target],
        actionId,
        itemId: null,
      })
      await executor.execute(singleCtx)
    }
  } else {
    await executor.execute(ctx)
  }
}
