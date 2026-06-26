import type { Forma } from './Forma'

function validateForma(forma: unknown): Forma {
  if (!forma || typeof forma !== 'object') {
    throw new Error('dtk-opus: Forma must be a non-null object')
  }
  const f = forma as Record<string, unknown>

  if (!Array.isArray(f['steps'])) {
    throw new Error('dtk-opus: Forma.steps must be an array')
  }

  if (!f['advancement'] || typeof f['advancement'] !== 'object') {
    throw new Error('dtk-opus: Forma.advancement must be defined')
  }

  const stepIds = new Set<string>()
  for (const step of f['steps'] as Array<Record<string, unknown>>) {
    if (typeof step['id'] !== 'string') {
      throw new Error('dtk-opus: each step must have a string id')
    }
    if (stepIds.has(step['id'])) {
      throw new Error(`dtk-opus: duplicate step id "${step['id']}"`)
    }
    stepIds.add(step['id'])
  }

  const advancement = f['advancement'] as Record<string, unknown>
  if (Array.isArray(advancement['tracks'])) {
    for (const track of advancement['tracks'] as Array<Record<string, unknown>>) {
      const unlockAfter = track['unlock_after']
      if (typeof unlockAfter === 'string' && !stepIds.has(unlockAfter)) {
        throw new Error(
          `dtk-opus: advancement "${track['id']}" references unknown step id "${unlockAfter}"`
        )
      }
    }
  }

  return forma as Forma
}

export class FormaRegistry {
  private formas = new Map<string, Forma>()

  register(systemId: string, forma: unknown): void {
    const validated = validateForma(forma)
    if (this.formas.has(systemId)) {
      console.warn(`dtk-opus: Forma already registered for system "${systemId}", overwriting`)
    }
    this.formas.set(systemId, validated)
  }

  get(systemId: string): Forma | null {
    return this.formas.get(systemId) ?? null
  }

}
