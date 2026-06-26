import { describe, it, expect, vi } from 'vitest'
import { AwaitCoordinator } from '../../../../src/domain/services/AwaitCoordinator.js'
import { InMemoryCombatStateStore } from '../../../../src/adapters/in-memory/InMemoryCombatStateStore.js'
import { StubSocketRelay } from '../../../../src/adapters/in-memory/StubSocketRelay.js'
import { StubActionExecutor } from '../../../../src/adapters/in-memory/StubActionExecutor.js'
import { InMemoryActorRepository } from '../../../../src/adapters/in-memory/InMemoryActorRepository.js'
import { PendingDecision } from '../../../../src/domain/entities/PendingDecision.js'
import { makeActorSnapshot, makePendingDecisionPayload } from '../../helpers/fixtures.js'

const BASE_PAYLOAD = {
  sequenceId: 'seq-1',
  stepId: 'step-1',
  choices: [{ id: 'a', label: 'Option A' }],
  actorId: 'actor-1',
}

function makeCoordinator({
  isGm = false,
  actorOwned = false,
}: { isGm?: boolean; actorOwned?: boolean } = {}) {
  const store = new InMemoryCombatStateStore()
  const socket = new StubSocketRelay(isGm)
  const executor = new StubActionExecutor()
  const repo = new InMemoryActorRepository()
  repo.seed(makeActorSnapshot({ actorId: 'actor-1' }))
  if (actorOwned) repo.seedOwned('actor-1')
  const renderCalls: PendingDecision[] = []
  const coordinator = new AwaitCoordinator(store, socket, executor, repo, (d) => {
    renderCalls.push(d)
  })
  return { store, socket, executor, repo, coordinator, renderCalls }
}

describe('AwaitCoordinator', () => {
  describe('handleAwait', () => {
    it('persists decision to store before doing anything else', async () => {
      const { store, coordinator } = makeCoordinator({ isGm: true, actorOwned: true })
      await coordinator.handleAwait(BASE_PAYLOAD, 1000)
      expect(store.readPending('seq-1')).toBeDefined()
    })

    it('GM + owned: renders decision locally', async () => {
      const { coordinator, renderCalls, socket } = makeCoordinator({ isGm: true, actorOwned: true })
      await coordinator.handleAwait(BASE_PAYLOAD, 1000)
      expect(renderCalls).toHaveLength(1)
      expect(socket.sent).toHaveLength(0)
    })

    it('GM + not-owned: sends decision-relay via socket', async () => {
      const { coordinator, socket, renderCalls } = makeCoordinator({ isGm: true, actorOwned: false })
      await coordinator.handleAwait(BASE_PAYLOAD, 1000)
      expect(renderCalls).toHaveLength(0)
      expect(socket.sent).toHaveLength(1)
      expect(socket.sent[0]?.type).toBe('dtk-systema.decision-relay')
    })

    it('not-GM + owned: sends decision-request via socket', async () => {
      const { coordinator, socket, renderCalls } = makeCoordinator({ isGm: false, actorOwned: true })
      await coordinator.handleAwait(BASE_PAYLOAD, 1000)
      expect(renderCalls).toHaveLength(0)
      expect(socket.sent).toHaveLength(1)
      expect(socket.sent[0]?.type).toBe('dtk-systema.decision-request')
    })

    it('not-GM + not-owned: no render and no socket message', async () => {
      const { coordinator, socket, renderCalls } = makeCoordinator({ isGm: false, actorOwned: false })
      await coordinator.handleAwait(BASE_PAYLOAD, 1000)
      expect(renderCalls).toHaveLength(0)
      expect(socket.sent).toHaveLength(0)
    })

    it('creates PendingDecision with correct pendingAt timestamp', async () => {
      const { store, coordinator } = makeCoordinator({ isGm: true, actorOwned: true })
      await coordinator.handleAwait(BASE_PAYLOAD, 5000)
      const pending = store.readPending('seq-1')
      expect(pending?.pendingAt).toBe(5000)
    })

    it('stores timeout from payload', async () => {
      const { store, coordinator } = makeCoordinator({ isGm: true, actorOwned: true })
      await coordinator.handleAwait({ ...BASE_PAYLOAD, timeout: 30000 }, 1000)
      const pending = store.readPending('seq-1')
      expect(pending?.timeout).toBe(30000)
    })

    it('stores defaultChoice from payload', async () => {
      const { store, coordinator } = makeCoordinator({ isGm: true, actorOwned: true })
      await coordinator.handleAwait({ ...BASE_PAYLOAD, default: 'a' }, 1000)
      const pending = store.readPending('seq-1')
      expect(pending?.defaultChoice).toBe('a')
    })

    it('stores null timeout when not in payload', async () => {
      const { store, coordinator } = makeCoordinator({ isGm: true, actorOwned: true })
      await coordinator.handleAwait(BASE_PAYLOAD, 1000)
      const pending = store.readPending('seq-1')
      expect(pending?.timeout).toBeNull()
    })

    it('renders PendingDecision instance to renderDecision callback', async () => {
      const { coordinator, renderCalls } = makeCoordinator({ isGm: true, actorOwned: true })
      await coordinator.handleAwait(BASE_PAYLOAD, 1000)
      expect(renderCalls[0]).toBeInstanceOf(PendingDecision)
    })
  })

  describe('handleResponse', () => {
    it('clears pending state from store', async () => {
      const { store, coordinator } = makeCoordinator({ isGm: true, actorOwned: true })
      await coordinator.handleAwait(BASE_PAYLOAD, 1000)
      await coordinator.handleResponse('seq-1', 'a')
      expect(store.readPending('seq-1')).toBeUndefined()
    })

    it('calls executor.resume with sequenceId and choice', async () => {
      const { executor, coordinator } = makeCoordinator()
      await coordinator.handleResponse('seq-1', 'b')
      expect(executor.resumeCalls).toHaveLength(1)
      expect(executor.resumeCalls[0]?.sequenceId).toBe('seq-1')
      expect(executor.resumeCalls[0]?.choice).toBe('b')
    })
  })

  describe('recoverPending', () => {
    it('does nothing with an empty store', async () => {
      const { coordinator, renderCalls, socket } = makeCoordinator({ isGm: true, actorOwned: true })
      await coordinator.recoverPending(9999)
      expect(renderCalls).toHaveLength(0)
      expect(socket.sent).toHaveLength(0)
    })

    it('re-renders valid pending decisions for owned actors', async () => {
      const { store, coordinator, renderCalls } = makeCoordinator({ isGm: true, actorOwned: true })
      const payload = makePendingDecisionPayload({ pendingAt: 1000, timeout: null })
      await store.writePending('seq-1', payload)
      await coordinator.recoverPending(5000)
      expect(renderCalls).toHaveLength(1)
    })

    it('clears expired pending decisions without re-rendering', async () => {
      const { store, coordinator, renderCalls } = makeCoordinator({ isGm: true, actorOwned: true })
      const payload = makePendingDecisionPayload({ pendingAt: 1000, timeout: 5000 })
      await store.writePending('seq-1', payload)
      await coordinator.recoverPending(10000) // past expiry (1000 + 5000 = 6000)
      expect(renderCalls).toHaveLength(0)
      expect(store.readPending('seq-1')).toBeUndefined()
    })

    it('does not render when actor is not owned by current user', async () => {
      const { store, coordinator, renderCalls } = makeCoordinator({ isGm: false, actorOwned: false })
      const payload = makePendingDecisionPayload({ pendingAt: 1000, timeout: null })
      await store.writePending('seq-1', payload)
      await coordinator.recoverPending(2000)
      expect(renderCalls).toHaveLength(0)
    })

    it('handles multiple pending decisions independently', async () => {
      const store = new InMemoryCombatStateStore()
      const socket = new StubSocketRelay(true)
      const executor = new StubActionExecutor()
      const repo = new InMemoryActorRepository()
      repo.seed(makeActorSnapshot({ actorId: 'actor-1' }))
      repo.seed(makeActorSnapshot({ actorId: 'actor-2' }))
      repo.seedOwned('actor-1')
      // actor-2 not owned

      const renderCalls: PendingDecision[] = []
      const coordinator = new AwaitCoordinator(store, socket, executor, repo, (d) => {
        renderCalls.push(d)
      })

      const p1 = makePendingDecisionPayload({ sequenceId: 'seq-1', actorId: 'actor-1', pendingAt: 1000, timeout: null })
      const p2 = makePendingDecisionPayload({ sequenceId: 'seq-2', actorId: 'actor-2', pendingAt: 1000, timeout: null })
      await store.writePending('seq-1', p1)
      await store.writePending('seq-2', p2)

      await coordinator.recoverPending(2000)
      // Only actor-1 is owned, so only one render
      expect(renderCalls).toHaveLength(1)
      expect(renderCalls[0]?.actorId).toBe('actor-1')
    })
  })
})
