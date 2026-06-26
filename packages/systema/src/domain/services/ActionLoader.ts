import type { IActorRepository } from '../../ports/IActorRepository.js'

export interface ActionExemplar {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly condition: string | null
  readonly targetingMode: 'token' | 'self' | 'area' | 'none'
  readonly executionMode: 'per-target' | 'once'
  readonly iconPath: string | null
}

const VALID_TARGETING_MODES = new Set<string>(['token', 'self', 'area', 'none'])
const VALID_EXECUTION_MODES = new Set<string>(['per-target', 'once'])

export class ActionLoader {
  constructor(private readonly repo: IActorRepository) {}

  load(actorId: string): ActionExemplar[] {
    const snapshot = this.repo.getSnapshot(actorId)
    if (!snapshot) return []

    const dtk = (snapshot.flags as Record<string, unknown>)['dtk-systema']
    if (!dtk || typeof dtk !== 'object') return []

    const dtkFlags = dtk as Record<string, unknown>
    const exemplars = dtkFlags['exemplars']
    if (!exemplars || typeof exemplars !== 'object') return []

    const exemplarMap = exemplars as Record<string, unknown>
    const results: ActionExemplar[] = []

    for (const id of snapshot.actionIds) {
      const raw = exemplarMap[id]
      if (!raw || typeof raw !== 'object') {
        console.warn(`dtk-systema: ActionLoader — missing exemplar data for action id "${id}"`)
        continue
      }

      const entry = raw as Record<string, unknown>

      if (typeof entry['label'] !== 'string') {
        console.warn(`dtk-systema: ActionLoader — exemplar "${id}" missing required field "label"`)
        continue
      }

      const targetingMode = entry['targetingMode']
      if (typeof targetingMode !== 'string' || !VALID_TARGETING_MODES.has(targetingMode)) {
        console.warn(
          `dtk-systema: ActionLoader — exemplar "${id}" has unknown targetingMode "${String(targetingMode)}"`,
        )
        continue
      }

      const executionMode = entry['executionMode']
      const resolvedExecutionMode: 'per-target' | 'once' =
        typeof executionMode === 'string' && VALID_EXECUTION_MODES.has(executionMode)
          ? (executionMode as 'per-target' | 'once')
          : 'per-target'

      results.push({
        id,
        label: entry['label'] as string,
        description: typeof entry['description'] === 'string' ? entry['description'] : '',
        condition: typeof entry['condition'] === 'string' ? entry['condition'] : null,
        targetingMode: targetingMode as 'token' | 'self' | 'area' | 'none',
        executionMode: resolvedExecutionMode,
        iconPath: typeof entry['iconPath'] === 'string' ? entry['iconPath'] : null,
      })
    }

    return results
  }
}
