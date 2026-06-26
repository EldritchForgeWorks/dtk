import { describe, it, expect } from 'vitest'

import {
  GrantSchema,
  ModifierGrantSchema,
  ReferenceGrantSchema,
  ChoiceGrantSchema,
  RuleModifierGrantSchema,
  type Grant,
} from '../../../src/exemplar/grant.js'

import {
  ExemplarBaseSchema,
  SpeciesExemplarSchema,
  ArchetypeExemplarSchema,
  DisciplineExemplarSchema,
  VocationExemplarSchema,
  ItemExemplarSchema,
  BackgroundExemplarSchema,
  OriginExemplarSchema,
  FeatureExemplarSchema,
} from '../../../src/exemplar/kinds/class-layer.js'

import { RuleExemplarSchema, TierConsequenceSchema, ChainDefSchema } from '../../../src/exemplar/kinds/rule.js'

import {
  SequenceExemplarSchema,
  SequenceStepSchema,
  AwaitSpecSchema,
} from '../../../src/exemplar/kinds/sequence.js'

import {
  ActionExemplarSchema,
  TargetingSpecSchema,
  TokenTargetingSchema,
  AreaTargetingSchema,
  ActionCostSchema,
} from '../../../src/exemplar/kinds/action.js'

import { ExemplarSchema } from '../../../src/exemplar/schema.js'

import {
  isExemplar,
  isSpecies,
  isArchetype,
  isDiscipline,
  isVocation,
  isItem,
  isBackground,
  isOrigin,
  isFeature,
  isRule,
  isSequence,
  isAction,
} from '../../../src/exemplar/guards.js'

// ─── Fixture factories ────────────────────────────────────────────────────────

function base(kind: string) {
  return {
    id: 'test-exemplar',
    version: '0.1.0',
    kind,
    name: 'Test Exemplar',
  }
}

const modifierGrant = { type: 'modifier' as const, path: 'attributes.body', value: 2 }
const referenceGrant = { type: 'reference' as const, exemplarId: 'some-exemplar' }
const ruleModifierGrant = {
  type: 'rule-modifier' as const,
  ruleId: 'my-rule',
  overrides: { threshold: 4 },
}

function choiceGrant(from: Grant[] = [modifierGrant, referenceGrant]) {
  return { type: 'choice' as const, label: 'Pick one', choose: 1, from }
}

function validSpecies() {
  return { ...base('species'), grants: [modifierGrant] }
}

function validRule() {
  return {
    ...base('rule'),
    kind: 'rule' as const,
    ritus: 'sr6',
    pool: 'agility + firearms',
  }
}

function validSequence() {
  return {
    ...base('sequence'),
    kind: 'sequence' as const,
    steps: [{ id: 'step-1', rule: 'my-rule-id' }],
  }
}

function validAction() {
  return {
    ...base('action'),
    kind: 'action' as const,
    sequence: 'my-sequence-id',
    targeting: { mode: 'self' as const },
  }
}

// ─── Boundary ─────────────────────────────────────────────────────────────────
describe('Boundary', () => {
  // id length
  it('id of exactly one character is accepted', () => {
    expect(ExemplarBaseSchema.safeParse({ ...base('rule'), id: 'x' }).success).toBe(true)
  })

  it('empty id is rejected', () => {
    expect(ExemplarBaseSchema.safeParse({ ...base('rule'), id: '' }).success).toBe(false)
  })

  // version semver
  it('version "0.0.0" is accepted', () => {
    expect(ExemplarBaseSchema.safeParse({ ...base('rule'), version: '0.0.0' }).success).toBe(true)
  })

  it('version "1.2.3" is accepted', () => {
    expect(ExemplarBaseSchema.safeParse({ ...base('rule'), version: '1.2.3' }).success).toBe(true)
  })

  it('version "1.2" (missing patch) is rejected', () => {
    expect(ExemplarBaseSchema.safeParse({ ...base('rule'), version: '1.2' }).success).toBe(false)
  })

  it('version "abc" is rejected', () => {
    expect(ExemplarBaseSchema.safeParse({ ...base('rule'), version: 'abc' }).success).toBe(false)
  })

  // name length
  it('name of exactly one character is accepted', () => {
    expect(ExemplarBaseSchema.safeParse({ ...base('rule'), name: 'x' }).success).toBe(true)
  })

  it('empty name is rejected', () => {
    expect(ExemplarBaseSchema.safeParse({ ...base('rule'), name: '' }).success).toBe(false)
  })

  // ChoiceGrant.choose positive int
  it('choose of 1 is accepted', () => {
    expect(ChoiceGrantSchema.safeParse({ ...choiceGrant(), choose: 1 }).success).toBe(true)
  })

  it('choose of 0 is rejected', () => {
    expect(ChoiceGrantSchema.safeParse({ ...choiceGrant(), choose: 0 }).success).toBe(false)
  })

  it('choose of -1 is rejected', () => {
    expect(ChoiceGrantSchema.safeParse({ ...choiceGrant(), choose: -1 }).success).toBe(false)
  })

  // RuleModifierGrant.overrides min 1 key
  it('ruleModifierGrant with 1 key in overrides is accepted', () => {
    expect(RuleModifierGrantSchema.safeParse(ruleModifierGrant).success).toBe(true)
  })

  it('ruleModifierGrant with 0 keys in overrides is rejected', () => {
    expect(
      RuleModifierGrantSchema.safeParse({ ...ruleModifierGrant, overrides: {} }).success,
    ).toBe(false)
  })

  // Sequence steps min 1
  it('sequence with 1 step is accepted', () => {
    expect(SequenceExemplarSchema.safeParse(validSequence()).success).toBe(true)
  })

  it('sequence with 0 steps is rejected', () => {
    expect(
      SequenceExemplarSchema.safeParse({ ...validSequence(), steps: [] }).success,
    ).toBe(false)
  })

  // AwaitSpec.choices min 1
  it('awaitSpec with 1 choice is accepted', () => {
    const spec = { type: 'player-decision' as const, choices: ['yes'] }
    expect(AwaitSpecSchema.safeParse(spec).success).toBe(true)
  })

  it('awaitSpec with 0 choices is rejected', () => {
    expect(AwaitSpecSchema.safeParse({ type: 'player-decision', choices: [] }).success).toBe(false)
  })

  // TokenTargeting min <= max
  it('token targeting min=1 max=3 is accepted', () => {
    expect(
      TokenTargetingSchema.safeParse({ mode: 'token', min: 1, max: 3 }).success,
    ).toBe(true)
  })

  it('token targeting min=max=2 is accepted', () => {
    expect(
      TokenTargetingSchema.safeParse({ mode: 'token', min: 2, max: 2 }).success,
    ).toBe(true)
  })

  it('token targeting min=3 max=1 is rejected', () => {
    expect(
      TokenTargetingSchema.safeParse({ mode: 'token', min: 3, max: 1 }).success,
    ).toBe(false)
  })

  it('token targeting min present max=null is accepted', () => {
    expect(
      TokenTargetingSchema.safeParse({ mode: 'token', min: 5, max: null }).success,
    ).toBe(true)
  })

  // AreaTargeting size positive
  it('area targeting size=1 is accepted', () => {
    expect(
      AreaTargetingSchema.safeParse({ mode: 'area', shape: 'circle', size: 1 }).success,
    ).toBe(true)
  })

  it('area targeting size=0 is rejected', () => {
    expect(
      AreaTargetingSchema.safeParse({ mode: 'area', shape: 'circle', size: 0 }).success,
    ).toBe(false)
  })

  it('area targeting size=-1 is rejected', () => {
    expect(
      AreaTargetingSchema.safeParse({ mode: 'area', shape: 'circle', size: -1 }).success,
    ).toBe(false)
  })
})

// ─── Scenario ─────────────────────────────────────────────────────────────────
describe('Scenario', () => {
  // All 11 kinds parse successfully
  it('species kind parses with empty grants array', () => {
    const r = SpeciesExemplarSchema.safeParse({ ...base('species'), grants: [] })
    expect(r.success).toBe(true)
  })

  it('archetype kind parses with modifier grant', () => {
    const r = ArchetypeExemplarSchema.safeParse({
      ...base('archetype'),
      grants: [modifierGrant],
    })
    expect(r.success).toBe(true)
  })

  it('discipline kind requires parent field', () => {
    const r = DisciplineExemplarSchema.safeParse({
      ...base('discipline'),
      parent: 'archetype-id',
      grants: [],
    })
    expect(r.success).toBe(true)
  })

  it('vocation kind requires parent field', () => {
    const r = VocationExemplarSchema.safeParse({
      ...base('vocation'),
      parent: 'discipline-id',
      grants: [],
    })
    expect(r.success).toBe(true)
  })

  it('item kind requires itemType field', () => {
    const r = ItemExemplarSchema.safeParse({
      ...base('item'),
      itemType: 'weapon',
      grants: [],
    })
    expect(r.success).toBe(true)
  })

  it('background kind parses with reference grant', () => {
    const r = BackgroundExemplarSchema.safeParse({
      ...base('background'),
      grants: [referenceGrant],
    })
    expect(r.success).toBe(true)
  })

  it('origin kind parses with rule-modifier grant', () => {
    const r = OriginExemplarSchema.safeParse({
      ...base('origin'),
      grants: [ruleModifierGrant],
    })
    expect(r.success).toBe(true)
  })

  it('feature kind parses with all grant types', () => {
    const r = FeatureExemplarSchema.safeParse({
      ...base('feature'),
      grants: [modifierGrant, referenceGrant, ruleModifierGrant, choiceGrant()],
    })
    expect(r.success).toBe(true)
  })

  it('rule kind parses with all optional fields', () => {
    const r = RuleExemplarSchema.safeParse({
      ...validRule(),
      opposed: 'reaction + intuition',
      mechanic: 'pool-count',
      threshold: 3,
      tiers: { critical: 4, hit: 1, glancing: 0 },
      on_tier: { critical: { damage: '2d6', chat: 'Critical hit!' } },
      chains: { followup: { pool: 'agility', opposed: 'reaction' } },
    })
    expect(r.success).toBe(true)
  })

  it('rule kind parses with only required fields', () => {
    expect(RuleExemplarSchema.safeParse(validRule()).success).toBe(true)
  })

  it('sequence kind parses step with rule reference', () => {
    const r = SequenceExemplarSchema.safeParse(validSequence())
    expect(r.success).toBe(true)
  })

  it('sequence kind parses step with sequence reference', () => {
    const r = SequenceExemplarSchema.safeParse({
      ...base('sequence'),
      kind: 'sequence',
      steps: [{ id: 'step-1', sequence: 'sub-sequence-id' }],
    })
    expect(r.success).toBe(true)
  })

  it('sequence step with all optional fields parses', () => {
    const r = SequenceStepSchema.safeParse({
      id: 'step-1',
      rule: 'rule-id',
      actor: 'initiator',
      condition: 'target.hp > 0',
      await: { type: 'player-decision', choices: ['yes', 'no'], timeout: 30, default: 'yes', actor: 'target' },
      inputs: { target: 'current-target' },
    })
    expect(r.success).toBe(true)
  })

  it('action kind parses with self targeting', () => {
    expect(ActionExemplarSchema.safeParse(validAction()).success).toBe(true)
  })

  it('action kind parses with none targeting', () => {
    const r = ActionExemplarSchema.safeParse({
      ...validAction(),
      targeting: { mode: 'none' },
    })
    expect(r.success).toBe(true)
  })

  it('action kind parses with token targeting', () => {
    const r = ActionExemplarSchema.safeParse({
      ...validAction(),
      targeting: { mode: 'token', min: 1, max: 3, filter: 'enemies', execution: 'per-target' },
    })
    expect(r.success).toBe(true)
  })

  it('action kind parses with area targeting and all shapes', () => {
    for (const shape of ['circle', 'cone', 'line', 'ray'] as const) {
      const r = ActionExemplarSchema.safeParse({
        ...validAction(),
        targeting: { mode: 'area', shape, size: 5 },
      })
      expect(r.success, `shape ${shape} should be valid`).toBe(true)
    }
  })

  it('action kind parses with all optional fields', () => {
    const r = ActionExemplarSchema.safeParse({
      ...validAction(),
      cost: { actionPoints: 1, bonusActions: 0, reactions: 0 },
      hint: 'Use this to strike',
      icon: 'icons/sword.svg',
      condition: 'actor.ap >= 1',
    })
    expect(r.success).toBe(true)
  })

  // Optional base fields
  it('exemplar base accepts optional description and tags', () => {
    const r = SpeciesExemplarSchema.safeParse({
      ...base('species'),
      grants: [],
      description: 'A test species',
      tags: ['humanoid', 'playable'],
    })
    expect(r.success).toBe(true)
  })

  it('exemplar base omits description and tags without error', () => {
    const r = SpeciesExemplarSchema.safeParse({ ...base('species'), grants: [] })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.description).toBeUndefined()
      expect(r.data.tags).toBeUndefined()
    }
  })

  // ExemplarSchema discriminated union
  it('ExemplarSchema parses all 11 kinds via discriminated union', () => {
    const kinds = [
      { ...base('species'), grants: [] },
      { ...base('archetype'), grants: [] },
      { ...base('discipline'), parent: 'arch', grants: [] },
      { ...base('vocation'), parent: 'disc', grants: [] },
      { ...base('item'), itemType: 'gear', grants: [] },
      { ...base('background'), grants: [] },
      { ...base('origin'), grants: [] },
      { ...base('feature'), grants: [] },
      { ...validRule() },
      { ...validSequence() },
      { ...validAction() },
    ]
    for (const kind of kinds) {
      const r = ExemplarSchema.safeParse(kind)
      expect(r.success, `kind=${kind.kind} should be valid`).toBe(true)
    }
  })

  // Mechanic enum values
  it('rule kind accepts all mechanic values', () => {
    for (const mechanic of ['pool-count', 'pool-sum', 'single-die', 'roll-under'] as const) {
      const r = RuleExemplarSchema.safeParse({ ...validRule(), mechanic })
      expect(r.success, `mechanic=${mechanic}`).toBe(true)
    }
  })

  // Actor enum values
  it('sequence step actor accepts all enum values', () => {
    for (const actor of ['initiator', 'target', 'gm', 'all'] as const) {
      const r = SequenceStepSchema.safeParse({ id: 's1', rule: 'r', actor })
      expect(r.success, `actor=${actor}`).toBe(true)
    }
  })
})

// ─── Failure ──────────────────────────────────────────────────────────────────
describe('Failure', () => {
  // Missing required fields
  it('missing id on ExemplarBase reports error on "id"', () => {
    const r = ExemplarBaseSchema.safeParse({ ...base('rule'), id: undefined })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.map((i) => i.path[0])).toContain('id')
    }
  })

  it('missing version reports error on "version"', () => {
    const r = ExemplarBaseSchema.safeParse({ ...base('rule'), version: undefined })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.map((i) => i.path[0])).toContain('version')
    }
  })

  it('discipline without parent is rejected', () => {
    const r = DisciplineExemplarSchema.safeParse({ ...base('discipline'), grants: [] })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.map((i) => i.path[0])).toContain('parent')
    }
  })

  it('vocation without parent is rejected', () => {
    const r = VocationExemplarSchema.safeParse({ ...base('vocation'), grants: [] })
    expect(r.success).toBe(false)
  })

  it('item without itemType is rejected', () => {
    const r = ItemExemplarSchema.safeParse({ ...base('item'), grants: [] })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.map((i) => i.path[0])).toContain('itemType')
    }
  })

  it('rule without ritus is rejected', () => {
    const r = RuleExemplarSchema.safeParse({ ...base('rule'), pool: 'agility' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.map((i) => i.path[0])).toContain('ritus')
    }
  })

  it('rule without pool is rejected', () => {
    const r = RuleExemplarSchema.safeParse({ ...base('rule'), ritus: 'sr6' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.map((i) => i.path[0])).toContain('pool')
    }
  })

  it('rule with invalid mechanic value is rejected', () => {
    const r = RuleExemplarSchema.safeParse({ ...validRule(), mechanic: 'exploding-dice' })
    expect(r.success).toBe(false)
  })

  // SequenceStep exactly-one-of constraint
  it('sequence step with neither rule nor sequence is rejected', () => {
    const r = SequenceStepSchema.safeParse({ id: 'step-1' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0]!.message).toContain('exactly one of')
    }
  })

  it('sequence step with both rule and sequence is rejected', () => {
    const r = SequenceStepSchema.safeParse({ id: 'step-1', rule: 'r1', sequence: 's1' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0]!.message).toContain('not both')
    }
  })

  // TokenTargeting cross-field constraint error path
  it('token targeting min > max reports error on path "min"', () => {
    const r = TokenTargetingSchema.safeParse({ mode: 'token', min: 5, max: 2 })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.map((i) => i.path[0])).toContain('min')
    }
  })

  // ActionExemplar missing required fields
  it('action without sequence is rejected', () => {
    const r = ActionExemplarSchema.safeParse({ ...base('action'), targeting: { mode: 'self' } })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.map((i) => i.path[0])).toContain('sequence')
    }
  })

  it('action without targeting is rejected', () => {
    const r = ActionExemplarSchema.safeParse({ ...base('action'), sequence: 'seq-id' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.map((i) => i.path[0])).toContain('targeting')
    }
  })

  it('action with unknown targeting mode is rejected', () => {
    const r = ActionExemplarSchema.safeParse({
      ...validAction(),
      targeting: { mode: 'burst' },
    })
    expect(r.success).toBe(false)
  })

  it('area targeting with unknown shape is rejected', () => {
    const r = AreaTargetingSchema.safeParse({ mode: 'area', shape: 'sphere', size: 5 })
    expect(r.success).toBe(false)
  })

  // ModifierGrant value type
  it('modifier grant with object value is rejected', () => {
    const r = ModifierGrantSchema.safeParse({ type: 'modifier', path: 'a.b', value: {} })
    expect(r.success).toBe(false)
  })

  // ReferenceGrant empty exemplarId
  it('reference grant with empty exemplarId is rejected', () => {
    const r = ReferenceGrantSchema.safeParse({ type: 'reference', exemplarId: '' })
    expect(r.success).toBe(false)
  })

  // ExemplarSchema wrong kind
  it('ExemplarSchema rejects unknown kind', () => {
    const r = ExemplarSchema.safeParse({ ...base('unknown-kind') })
    expect(r.success).toBe(false)
  })

  // Grant wrong type discriminator
  it('GrantSchema rejects unknown type discriminator', () => {
    const r = GrantSchema.safeParse({ type: 'boost', path: 'a', value: 1 })
    expect(r.success).toBe(false)
  })

  // TierConsequence — valid minimal (all optional)
  it('TierConsequenceSchema accepts empty object (all fields optional)', () => {
    expect(TierConsequenceSchema.safeParse({}).success).toBe(true)
  })

  // ChainDef missing pool
  it('ChainDefSchema rejects empty pool', () => {
    expect(ChainDefSchema.safeParse({ pool: '' }).success).toBe(false)
  })

  it('ChainDefSchema rejects missing pool', () => {
    expect(ChainDefSchema.safeParse({}).success).toBe(false)
  })
})

// ─── Combinatorial ────────────────────────────────────────────────────────────
describe('Combinatorial', () => {
  // Grant recursion: ChoiceGrant containing ChoiceGrant
  it('ChoiceGrant containing another ChoiceGrant (depth 2) is accepted', () => {
    const nested = choiceGrant([modifierGrant])
    const outer = choiceGrant([nested, referenceGrant])
    expect(GrantSchema.safeParse(outer).success).toBe(true)
  })

  it('ChoiceGrant containing ChoiceGrant containing ChoiceGrant (depth 3) is accepted', () => {
    const level1 = choiceGrant([modifierGrant])
    const level2 = choiceGrant([level1])
    const level3 = choiceGrant([level2])
    expect(GrantSchema.safeParse(level3).success).toBe(true)
  })

  it('ChoiceGrant with empty from array is accepted (choose from nothing)', () => {
    const r = ChoiceGrantSchema.safeParse({ type: 'choice', label: 'Pick', choose: 1, from: [] })
    expect(r.success).toBe(true)
  })

  it('all 4 grant types each parse independently', () => {
    const grants = [
      modifierGrant,
      referenceGrant,
      choiceGrant(),
      ruleModifierGrant,
    ]
    for (const g of grants) {
      const r = GrantSchema.safeParse(g)
      expect(r.success, `grant.type=${g.type}`).toBe(true)
    }
  })

  it('modifier grant value can be number, string, or boolean', () => {
    for (const value of [42, 'bonus', true, false, -1, 0]) {
      const r = ModifierGrantSchema.safeParse({ type: 'modifier', path: 'a.b', value })
      expect(r.success, `value=${value}`).toBe(true)
    }
  })

  // All 8 class-layer kinds with multiple grants
  it('class-layer kinds accept mixed grant arrays', () => {
    const schemas = [
      { schema: SpeciesExemplarSchema, data: { ...base('species'), grants: [modifierGrant, referenceGrant] } },
      { schema: ArchetypeExemplarSchema, data: { ...base('archetype'), grants: [choiceGrant()] } },
      { schema: BackgroundExemplarSchema, data: { ...base('background'), grants: [ruleModifierGrant] } },
      { schema: OriginExemplarSchema, data: { ...base('origin'), grants: [modifierGrant] } },
      { schema: FeatureExemplarSchema, data: { ...base('feature'), grants: [referenceGrant] } },
    ]
    for (const { schema, data } of schemas) {
      expect(schema.safeParse(data).success, `kind=${data.kind}`).toBe(true)
    }
  })

  // SequenceStep actors × rule vs sequence
  it('all actor values with rule reference produce valid steps', () => {
    for (const actor of ['initiator', 'target', 'gm', 'all'] as const) {
      const r = SequenceStepSchema.safeParse({ id: 's1', rule: 'rule-id', actor })
      expect(r.success, `actor=${actor}`).toBe(true)
    }
  })

  it('all actor values with sequence reference produce valid steps', () => {
    for (const actor of ['initiator', 'target', 'gm', 'all'] as const) {
      const r = SequenceStepSchema.safeParse({ id: 's1', sequence: 'seq-id', actor })
      expect(r.success, `actor=${actor}`).toBe(true)
    }
  })

  // TargetingSpec all modes
  it('all targeting modes produce valid TargetingSpec', () => {
    const modes = [
      { mode: 'self' as const },
      { mode: 'none' as const },
      { mode: 'token' as const, min: 1, max: 2 },
      { mode: 'area' as const, shape: 'circle' as const, size: 10 },
    ]
    for (const t of modes) {
      expect(TargetingSpecSchema.safeParse(t).success, `mode=${t.mode}`).toBe(true)
    }
  })

  // ActionCost — all fields optional, combinations
  it('ActionCost accepts any subset of cost fields', () => {
    const combos = [
      {},
      { actionPoints: 1 },
      { bonusActions: 1 },
      { reactions: 1 },
      { actionPoints: 2, bonusActions: 1 },
      { actionPoints: 1, bonusActions: 0, reactions: 0 },
    ]
    for (const cost of combos) {
      expect(ActionCostSchema.safeParse(cost).success, JSON.stringify(cost)).toBe(true)
    }
  })

  // Token targeting boundary combinations
  it('token targeting min=max for values 0-5 is always accepted', () => {
    for (let n = 0; n <= 5; n++) {
      const r = TokenTargetingSchema.safeParse({ mode: 'token', min: n, max: n })
      expect(r.success, `min=max=${n}`).toBe(true)
    }
  })

  it('token targeting min > max for all n is always rejected', () => {
    for (const [min, max] of [[2, 1], [5, 3], [10, 0]] as [number, number][]) {
      const r = TokenTargetingSchema.safeParse({ mode: 'token', min, max })
      expect(r.success, `min=${min} max=${max}`).toBe(false)
    }
  })

  // Guards: all 12
  it('isExemplar returns true for each of the 11 kinds', () => {
    const exemplars = [
      { ...base('species'), grants: [] },
      { ...base('archetype'), grants: [] },
      { ...base('discipline'), parent: 'arch', grants: [] },
      { ...base('vocation'), parent: 'disc', grants: [] },
      { ...base('item'), itemType: 'gear', grants: [] },
      { ...base('background'), grants: [] },
      { ...base('origin'), grants: [] },
      { ...base('feature'), grants: [] },
      { ...validRule() },
      { ...validSequence() },
      { ...validAction() },
    ]
    for (const e of exemplars) {
      expect(isExemplar(e), `kind=${e.kind}`).toBe(true)
    }
  })

  it('isExemplar returns false for non-objects', () => {
    for (const val of [null, undefined, 42, 'string', []]) {
      expect(isExemplar(val)).toBe(false)
    }
  })

  it('kind-specific guards return true only for matching kind', () => {
    const species = { ...base('species'), grants: [] }
    const rule = { ...validRule() }
    expect(isSpecies(species)).toBe(true)
    expect(isSpecies(rule)).toBe(false)
    expect(isRule(rule)).toBe(true)
    expect(isRule(species)).toBe(false)
  })

  it('all kind guards return false for null/undefined', () => {
    const guards = [isExemplar, isSpecies, isArchetype, isDiscipline, isVocation, isItem,
      isBackground, isOrigin, isFeature, isRule, isSequence, isAction]
    for (const guard of guards) {
      expect(guard(null), guard.name).toBe(false)
      expect(guard(undefined), guard.name).toBe(false)
    }
  })

  it('isArchetype, isDiscipline, isVocation, isItem, isBackground, isOrigin, isFeature each match their kind', () => {
    expect(isArchetype({ ...base('archetype'), grants: [] })).toBe(true)
    expect(isDiscipline({ ...base('discipline'), parent: 'a', grants: [] })).toBe(true)
    expect(isVocation({ ...base('vocation'), parent: 'd', grants: [] })).toBe(true)
    expect(isItem({ ...base('item'), itemType: 'armor', grants: [] })).toBe(true)
    expect(isBackground({ ...base('background'), grants: [] })).toBe(true)
    expect(isOrigin({ ...base('origin'), grants: [] })).toBe(true)
    expect(isFeature({ ...base('feature'), grants: [] })).toBe(true)
  })

  it('isSequence and isAction each match their kind', () => {
    expect(isSequence({ ...validSequence() })).toBe(true)
    expect(isAction({ ...validAction() })).toBe(true)
    expect(isSequence({ ...validAction() })).toBe(false)
    expect(isAction({ ...validSequence() })).toBe(false)
  })

  // Rule optional fields — various combinations
  it('rule with on_tier and chains parses correctly', () => {
    const r = RuleExemplarSchema.safeParse({
      ...validRule(),
      on_tier: {
        critical: { damage: '3d6', effect: 'stunned', chat: 'Critical!' },
        hit: { chain: 'follow-up' },
        glancing: { chat: 'Near miss' },
      },
      chains: {
        'follow-up': { pool: 'agility + 2' },
        'counter': { pool: 'reaction', opposed: 'agility' },
      },
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.on_tier?.critical?.damage).toBe('3d6')
      expect(r.data.chains?.['follow-up']?.pool).toBe('agility + 2')
    }
  })

  // Sequence with multiple steps
  it('sequence with multiple steps each having different fields', () => {
    const r = SequenceExemplarSchema.safeParse({
      ...base('sequence'),
      kind: 'sequence',
      steps: [
        { id: 'step-1', rule: 'rule-a', actor: 'initiator' },
        { id: 'step-2', sequence: 'sub-seq', condition: 'result.hit > 0' },
        {
          id: 'step-3',
          rule: 'rule-b',
          await: { type: 'player-decision', choices: ['continue', 'abort'] },
          inputs: { target: 'primary-target' },
        },
      ],
    })
    expect(r.success).toBe(true)
  })
})
