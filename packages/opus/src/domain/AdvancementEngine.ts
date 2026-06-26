import type { Forma, AdvancementTrack, AdvancementConfig } from './Forma'
import type { CharacterBuild, ParadigmState } from './CharacterBuild'
import type { PrerequisiteEvaluator, EvalContext } from './PrerequisiteEvaluator'

export interface AdvancementEntry {
  id: string
  title: string
  cost: number
  available: boolean
  purchased: boolean
  prerequisitesMet: boolean
  unlocked: boolean
}

function getTracks(config: AdvancementConfig): AdvancementTrack[] {
  if ('tracks' in config) return config.tracks
  return []
}

function evaluatePracticeExpression(expr: string, count: number): boolean {
  const match = expr.match(/\w+\s*(>=|<=|>|<|==|!=)\s*(\d+)/)
  if (!match) return false
  const op = match[1]
  const value = Number(match[2])
  switch (op) {
    case '>=': return count >= value
    case '<=': return count <= value
    case '>':  return count > value
    case '<':  return count < value
    case '==': return count === value
    case '!=': return count !== value
    default:   return false
  }
}

function isGateOpen(
  state: ParadigmState,
  config: AdvancementConfig,
  track: AdvancementTrack
): boolean {
  switch (state.paradigm) {
    case 'xp':
      return state.total - state.spent >= track.cost
    case 'milestone':
      return state.advancementsRemaining > 0
    case 'resource':
      return true
    case 'practice': {
      if (config.paradigm !== 'practice') return false
      const count = state.practiceLog[track.id] ?? 0
      return evaluatePracticeExpression(config.check_expression, count)
    }
    case 'marks':
      return state.total - state.spent >= track.cost
    case 'session':
      return state.advancementsRemaining > 0
  }
}

function updateParadigmState(state: ParadigmState, cost: number): ParadigmState {
  switch (state.paradigm) {
    case 'xp':
      return { ...state, spent: state.spent + cost }
    case 'milestone':
      return { ...state, advancementsRemaining: state.advancementsRemaining - 1 }
    case 'resource':
      return state
    case 'practice':
      return state
    case 'marks':
      return { ...state, spent: state.spent + cost }
    case 'session':
      return { ...state, advancementsRemaining: state.advancementsRemaining - 1 }
  }
}

export class AdvancementEngine {
  constructor(private evaluator: PrerequisiteEvaluator) {}

  canBuy(forma: Forma, build: CharacterBuild, advancementId: string): boolean {
    const tracks = getTracks(forma.advancement)
    const track = tracks.find(t => t.id === advancementId)
    if (!track) throw new Error(`dtk-opus: unknown advancement id "${advancementId}"`)

    if (build.advancements.some(a => a.id === advancementId)) return false

    if (track.unlock_after !== undefined && build.steps[track.unlock_after] === undefined) {
      return false
    }

    if (track.requires) {
      const context: EvalContext = {
        steps: build.steps,
        advancements: build.advancements.map(a => a.id),
      }
      if (!this.evaluator.evaluate(track.requires, context)) return false
    }

    return isGateOpen(build.paradigmState, forma.advancement, track)
  }

  availableAdvancements(forma: Forma, build: CharacterBuild): AdvancementEntry[] {
    const tracks = getTracks(forma.advancement)
    return tracks.map(track => {
      const unlocked =
        track.unlock_after === undefined || build.steps[track.unlock_after] !== undefined
      const purchased = build.advancements.some(a => a.id === track.id)
      const context: EvalContext = {
        steps: build.steps,
        advancements: build.advancements.map(a => a.id),
      }
      const prerequisitesMet = track.requires
        ? this.evaluator.evaluate(track.requires, context)
        : true
      const gateOpen = isGateOpen(build.paradigmState, forma.advancement, track)
      const available = !purchased && unlocked && prerequisitesMet && gateOpen
      return {
        id: track.id,
        title: track.title,
        cost: track.cost,
        available,
        purchased,
        prerequisitesMet,
        unlocked,
      }
    })
  }

  purchase(forma: Forma, build: CharacterBuild, advancementId: string, now = 0): CharacterBuild {
    if (!this.canBuy(forma, build, advancementId)) {
      throw new Error(`dtk-opus: cannot purchase advancement "${advancementId}"`)
    }

    const tracks = getTracks(forma.advancement)
    const track = tracks.find(t => t.id === advancementId)!

    return {
      ...build,
      advancements: [...build.advancements, { id: advancementId, purchasedAt: now }],
      paradigmState: updateParadigmState(build.paradigmState, track.cost),
    }
  }
}
