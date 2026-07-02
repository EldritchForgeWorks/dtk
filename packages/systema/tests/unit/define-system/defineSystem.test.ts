import { describe, it, expect, afterEach } from 'vitest'
import { defineSystem, setInitWindowOpen } from '../../../src/define-system/index.js'
import { SystemaError } from '../../../src/errors.js'

const MINIMAL_MODUS = {
  id: 'test-system',
  schemaVersion: 1,
  actors: {
    character: { label: 'Character', dataModel: {} },
  },
}

describe('defineSystem — init-window guard', () => {
  afterEach(() => {
    // Leave the module-level window state closed between tests.
    setInitWindowOpen(false)
  })

  it('throws SystemaError when the init window is closed', () => {
    setInitWindowOpen(false)
    expect(() => defineSystem(MINIMAL_MODUS)).toThrow(SystemaError)
  })

  it('throws with the documented message describing the required call site', () => {
    setInitWindowOpen(false)
    expect(() => defineSystem(MINIMAL_MODUS)).toThrow(
      /Hooks\.on\('init'\) handler/,
    )
  })
})
