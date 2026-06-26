import { describe, it, expect, vi, afterEach } from 'vitest'
import { ActionLoader } from '../../../../src/domain/services/ActionLoader.js'
import { InMemoryActorRepository } from '../../../../src/adapters/in-memory/InMemoryActorRepository.js'
import { makeActorSnapshot } from '../../helpers/fixtures.js'

describe('ActionLoader', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('load', () => {
    it('returns empty array when actor not found', () => {
      const repo = new InMemoryActorRepository()
      const loader = new ActionLoader(repo)
      expect(loader.load('nonexistent')).toEqual([])
    })

    it('returns empty array when dtk-systema flags are absent', () => {
      const repo = new InMemoryActorRepository()
      repo.seed(makeActorSnapshot({ flags: {}, actionIds: [] }))
      const loader = new ActionLoader(repo)
      expect(loader.load('actor-1')).toEqual([])
    })

    it('returns empty array when actionIds is empty', () => {
      const repo = new InMemoryActorRepository()
      repo.seed(makeActorSnapshot({
        actionIds: [],
        flags: { 'dtk-systema': { exemplars: {} } },
      }))
      const loader = new ActionLoader(repo)
      expect(loader.load('actor-1')).toEqual([])
    })

    it('returns ActionExemplar[] for actor with actions', () => {
      const repo = new InMemoryActorRepository()
      repo.seed(makeActorSnapshot())
      const loader = new ActionLoader(repo)
      const actions = loader.load('actor-1')
      expect(actions).toHaveLength(1)
      expect(actions[0]?.id).toBe('action-1')
      expect(actions[0]?.label).toBe('Strike')
    })

    it('returns all actions for actor with multiple actions', () => {
      const repo = new InMemoryActorRepository()
      repo.seed(makeActorSnapshot({
        actionIds: ['atk', 'dodge', 'run'],
        flags: {
          'dtk-systema': {
            exemplars: {
              atk: { label: 'Attack', targetingMode: 'token', executionMode: 'per-target', description: '', condition: null, iconPath: null },
              dodge: { label: 'Dodge', targetingMode: 'self', executionMode: 'once', description: 'Evade', condition: null, iconPath: null },
              run: { label: 'Run', targetingMode: 'none', executionMode: 'once', description: '', condition: null, iconPath: null },
            },
          },
        },
      }))
      const loader = new ActionLoader(repo)
      const actions = loader.load('actor-1')
      expect(actions).toHaveLength(3)
    })

    it('skips malformed exemplar with console.warn', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const repo = new InMemoryActorRepository()
      repo.seed(makeActorSnapshot({
        actionIds: ['bad-action'],
        flags: {
          'dtk-systema': { exemplars: { 'bad-action': null } },
        },
      }))
      const loader = new ActionLoader(repo)
      const actions = loader.load('actor-1')
      expect(actions).toHaveLength(0)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('missing exemplar data'))
    })

    it('skips exemplar missing label with console.warn', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const repo = new InMemoryActorRepository()
      repo.seed(makeActorSnapshot({
        actionIds: ['no-label'],
        flags: {
          'dtk-systema': {
            exemplars: { 'no-label': { targetingMode: 'token', executionMode: 'per-target' } },
          },
        },
      }))
      const loader = new ActionLoader(repo)
      const actions = loader.load('actor-1')
      expect(actions).toHaveLength(0)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('label'))
    })

    it('skips exemplar with unknown targetingMode', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const repo = new InMemoryActorRepository()
      repo.seed(makeActorSnapshot({
        actionIds: ['bad-mode'],
        flags: {
          'dtk-systema': {
            exemplars: { 'bad-mode': { label: 'Bad', targetingMode: 'diagonal', executionMode: 'once' } },
          },
        },
      }))
      const loader = new ActionLoader(repo)
      const actions = loader.load('actor-1')
      expect(actions).toHaveLength(0)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('targetingMode'))
    })

    it('defaults executionMode to per-target when absent', () => {
      const repo = new InMemoryActorRepository()
      repo.seed(makeActorSnapshot({
        actionIds: ['action-1'],
        flags: {
          'dtk-systema': {
            exemplars: { 'action-1': { label: 'Strike', targetingMode: 'token' } },
          },
        },
      }))
      const loader = new ActionLoader(repo)
      const actions = loader.load('actor-1')
      expect(actions[0]?.executionMode).toBe('per-target')
    })

    it('skips malformed but loads valid exemplar in same list', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const repo = new InMemoryActorRepository()
      repo.seed(makeActorSnapshot({
        actionIds: ['bad', 'good'],
        flags: {
          'dtk-systema': {
            exemplars: {
              bad: null,
              good: { label: 'Good', targetingMode: 'self', executionMode: 'once', description: '', condition: null, iconPath: null },
            },
          },
        },
      }))
      const loader = new ActionLoader(repo)
      const actions = loader.load('actor-1')
      expect(actions).toHaveLength(1)
      expect(actions[0]?.id).toBe('good')
      expect(warn).toHaveBeenCalled()
    })
  })
})
