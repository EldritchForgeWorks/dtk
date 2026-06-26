import { describe, it, expect } from 'vitest'
import { StubTemplateManager } from '../../../src/adapters/in-memory/StubTemplateManager.js'

describe('StubTemplateManager', () => {
  describe('create', () => {
    it('returns the default template id', async () => {
      const mgr = new StubTemplateManager()
      const id = await mgr.create({ type: 'circle', distance: 5 })
      expect(id).toBe('template-1')
    })

    it('returns the configured next id', async () => {
      const mgr = new StubTemplateManager().setNextId('tmpl-custom')
      const id = await mgr.create({ type: 'cone', distance: 6 })
      expect(id).toBe('tmpl-custom')
    })

    it('records the created spec', async () => {
      const mgr = new StubTemplateManager()
      const spec = { type: 'ray' as const, distance: 10 }
      await mgr.create(spec)
      expect(mgr.getCreated()[0]?.spec).toEqual(spec)
    })

    it('supports chaining setNextId', () => {
      const mgr = new StubTemplateManager()
      expect(mgr.setNextId('x')).toBe(mgr)
    })
  })

  describe('delete', () => {
    it('records deleted template id', async () => {
      const mgr = new StubTemplateManager()
      await mgr.delete('tmpl-1')
      expect(mgr.wasDeleted('tmpl-1')).toBe(true)
    })

    it('wasDeleted returns false for not-deleted id', () => {
      const mgr = new StubTemplateManager()
      expect(mgr.wasDeleted('tmpl-ghost')).toBe(false)
    })
  })

  describe('waitForPlacement', () => {
    it('resolves with default placement {0,0}', async () => {
      const mgr = new StubTemplateManager()
      const pos = await mgr.waitForPlacement()
      expect(pos).toEqual({ x: 0, y: 0 })
    })

    it('resolves with configured placement coordinates', async () => {
      const mgr = new StubTemplateManager().setPlacement(100, 200)
      const pos = await mgr.waitForPlacement()
      expect(pos).toEqual({ x: 100, y: 200 })
    })

    it('supports chaining setPlacement', () => {
      const mgr = new StubTemplateManager()
      expect(mgr.setPlacement(1, 2)).toBe(mgr)
    })
  })

  describe('wasCreated', () => {
    it('returns true for a created template id', async () => {
      const mgr = new StubTemplateManager().setNextId('tmpl-a')
      await mgr.create({ type: 'circle', distance: 1 })
      expect(mgr.wasCreated('tmpl-a')).toBe(true)
    })

    it('returns false for a template that was not created', () => {
      const mgr = new StubTemplateManager()
      expect(mgr.wasCreated('tmpl-ghost')).toBe(false)
    })
  })
})
