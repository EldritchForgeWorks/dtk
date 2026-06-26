import { describe, it, expect } from 'vitest'
import { FormaSchema } from '../../../src/forma/schema.js'
import { ConditionSchema } from '../../../src/forma/condition.js'
import { WizardFieldSchema } from '../../../src/forma/field.js'
import { isForma } from '../../../src/forma/guards.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const minimalStep = {
  id: 'step-1',
  label: 'Basic Info',
  fields: [],
}

const validForma = {
  id: 'sr6-char-create',
  systemId: 'sr6',
  creationSteps: [minimalStep],
  outputMapper: 'actor => actor',
}

// ─── Group 1: Basic Forma ─────────────────────────────────────────────────────

describe('Basic Forma', () => {
  it('minimal valid forma passes validation', () => {
    expect(FormaSchema.safeParse(validForma).success).toBe(true)
  })

  it('forma with multiple steps passes validation', () => {
    const result = FormaSchema.safeParse({
      ...validForma,
      creationSteps: [
        { id: 'step-1', label: 'Step 1', fields: [] },
        { id: 'step-2', label: 'Step 2', fields: [] },
        { id: 'step-3', label: 'Step 3', fields: [] },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('forma with advancementTracks passes validation', () => {
    const result = FormaSchema.safeParse({
      ...validForma,
      advancementTracks: [
        {
          id: 'track-1',
          label: 'Main Track',
          xpTable: [0, 10, 25, 50],
          advancements: [
            { id: 'adv-1', label: 'Boost Agility', cost: 5 },
            { id: 'adv-2', label: 'Unlock Hacking', cost: 10, prerequisite: 'adv-1', unlockStep: 'step-2' },
          ],
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('forma without advancementTracks is valid (optional)', () => {
    const { advancementTracks: _removed, ...noTracks } = { ...validForma, advancementTracks: undefined }
    expect(FormaSchema.safeParse(noTracks).success).toBe(true)
  })

  it('step with hint passes validation', () => {
    const result = FormaSchema.safeParse({
      ...validForma,
      creationSteps: [{ id: 'step-1', label: 'Step 1', hint: 'Choose wisely', fields: [] }],
    })
    expect(result.success).toBe(true)
  })

  it('isForma guard returns true for valid forma', () => {
    expect(isForma(validForma)).toBe(true)
  })

  it('isForma guard returns false for null', () => {
    expect(isForma(null)).toBe(false)
  })

  it('isForma guard returns false for plain string', () => {
    expect(isForma('not-a-forma')).toBe(false)
  })

  it('missing id is rejected', () => {
    const { id: _removed, ...noId } = validForma
    const result = FormaSchema.safeParse(noId)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path[0])).toContain('id')
    }
  })

  it('missing systemId is rejected', () => {
    const { systemId: _removed, ...noSystemId } = validForma
    const result = FormaSchema.safeParse(noSystemId)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path[0])).toContain('systemId')
    }
  })

  it('missing outputMapper is rejected', () => {
    const { outputMapper: _removed, ...noMapper } = validForma
    const result = FormaSchema.safeParse(noMapper)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path[0])).toContain('outputMapper')
    }
  })
})

// ─── Group 2: Recursive Conditions ───────────────────────────────────────────

describe('Recursive Conditions', () => {
  it('simple comparison condition is valid', () => {
    const result = ConditionSchema.safeParse({ op: 'eq', field: 'priority', value: 'A' })
    expect(result.success).toBe(true)
  })

  it('all comparison operators are accepted', () => {
    const ops = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'] as const
    for (const op of ops) {
      const result = ConditionSchema.safeParse({ op, field: 'score', value: 10 })
      expect(result.success, `op "${op}" should be valid`).toBe(true)
    }
  })

  it('comparison with boolean value is valid', () => {
    const result = ConditionSchema.safeParse({ op: 'eq', field: 'active', value: true })
    expect(result.success).toBe(true)
  })

  it('and condition with two comparisons is valid', () => {
    const result = ConditionSchema.safeParse({
      op: 'and',
      conditions: [
        { op: 'eq', field: 'race', value: 'elf' },
        { op: 'gt', field: 'karma', value: 5 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('or condition with two comparisons is valid', () => {
    const result = ConditionSchema.safeParse({
      op: 'or',
      conditions: [
        { op: 'eq', field: 'archetype', value: 'mage' },
        { op: 'eq', field: 'archetype', value: 'shaman' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('not condition wrapping a comparison is valid', () => {
    const result = ConditionSchema.safeParse({
      op: 'not',
      condition: { op: 'eq', field: 'mundane', value: true },
    })
    expect(result.success).toBe(true)
  })

  it('3-level deep nesting: not(and(or(eq,eq),gt)) is valid', () => {
    const result = ConditionSchema.safeParse({
      op: 'not',
      condition: {
        op: 'and',
        conditions: [
          {
            op: 'or',
            conditions: [
              { op: 'eq', field: 'class', value: 'mage' },
              { op: 'eq', field: 'class', value: 'adept' },
            ],
          },
          { op: 'gt', field: 'magic', value: 0 },
        ],
      },
    })
    expect(result.success).toBe(true)
  })

  it('step with a 3-level condition passes forma validation', () => {
    const result = FormaSchema.safeParse({
      ...validForma,
      creationSteps: [
        {
          id: 'step-1',
          label: 'Magic Step',
          condition: {
            op: 'not',
            condition: {
              op: 'and',
              conditions: [
                { op: 'eq', field: 'mundane', value: true },
                {
                  op: 'or',
                  conditions: [
                    { op: 'lt', field: 'magic', value: 1 },
                    { op: 'lt', field: 'resonance', value: 1 },
                  ],
                },
              ],
            },
          },
          fields: [],
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('unknown op is rejected', () => {
    const result = ConditionSchema.safeParse({ op: 'xor', field: 'x', value: 1 })
    expect(result.success).toBe(false)
  })

  it('comparison with empty field string is rejected', () => {
    const result = ConditionSchema.safeParse({ op: 'eq', field: '', value: 'v' })
    expect(result.success).toBe(false)
  })

  it('and with non-array conditions is rejected', () => {
    const result = ConditionSchema.safeParse({
      op: 'and',
      conditions: { op: 'eq', field: 'x', value: 1 },
    })
    expect(result.success).toBe(false)
  })
})

// ─── Group 3: Duplicate Step IDs ─────────────────────────────────────────────

describe('Duplicate Step IDs', () => {
  it('duplicate step ids are rejected', () => {
    const result = FormaSchema.safeParse({
      ...validForma,
      creationSteps: [
        { id: 'step-1', label: 'Step 1', fields: [] },
        { id: 'step-1', label: 'Step 1 Duplicate', fields: [] },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('duplicate step id error path points to the duplicate', () => {
    const result = FormaSchema.safeParse({
      ...validForma,
      creationSteps: [
        { id: 'step-1', label: 'Step A', fields: [] },
        { id: 'step-2', label: 'Step B', fields: [] },
        { id: 'step-1', label: 'Step C', fields: [] },
      ],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path)
      expect(paths.some((p) => p.includes('creationSteps'))).toBe(true)
    }
  })

  it('three steps with same id produces at least one issue', () => {
    const result = FormaSchema.safeParse({
      ...validForma,
      creationSteps: [
        { id: 'dup', label: 'A', fields: [] },
        { id: 'dup', label: 'B', fields: [] },
        { id: 'dup', label: 'C', fields: [] },
      ],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('unique ids across all steps are accepted', () => {
    const result = FormaSchema.safeParse({
      ...validForma,
      creationSteps: [
        { id: 'a', label: 'A', fields: [] },
        { id: 'b', label: 'B', fields: [] },
        { id: 'c', label: 'C', fields: [] },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('empty creationSteps array is rejected (min 1)', () => {
    const result = FormaSchema.safeParse({ ...validForma, creationSteps: [] })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('creationSteps')
    }
  })
})

// ─── Group 4: All Field Types ─────────────────────────────────────────────────

describe('All Field Types', () => {
  it('text field is valid', () => {
    const result = WizardFieldSchema.safeParse({
      type: 'text',
      id: 'name',
      label: 'Character Name',
    })
    expect(result.success).toBe(true)
  })

  it('text field with required:true is valid', () => {
    const result = WizardFieldSchema.safeParse({
      type: 'text',
      id: 'name',
      label: 'Character Name',
      required: true,
    })
    expect(result.success).toBe(true)
  })

  it('number field with min and max is valid', () => {
    const result = WizardFieldSchema.safeParse({
      type: 'number',
      id: 'age',
      label: 'Age',
      min: 0,
      max: 150,
    })
    expect(result.success).toBe(true)
  })

  it('number field without min/max is valid', () => {
    const result = WizardFieldSchema.safeParse({ type: 'number', id: 'score', label: 'Score' })
    expect(result.success).toBe(true)
  })

  it('select field with options is valid', () => {
    const result = WizardFieldSchema.safeParse({
      type: 'select',
      id: 'metatype',
      label: 'Metatype',
      options: [
        { value: 'human', label: 'Human' },
        { value: 'elf', label: 'Elf' },
        { value: 'dwarf', label: 'Dwarf' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('select field with empty options array is valid', () => {
    const result = WizardFieldSchema.safeParse({
      type: 'select',
      id: 'empty-select',
      label: 'Empty',
      options: [],
    })
    expect(result.success).toBe(true)
  })

  it('allocation field is valid', () => {
    const result = WizardFieldSchema.safeParse({
      type: 'allocation',
      id: 'attr-alloc',
      label: 'Attribute Allocation',
      pool: 'priorityPool.attributes',
      targets: ['body', 'agility', 'strength'],
    })
    expect(result.success).toBe(true)
  })

  it('priority-matrix field is valid', () => {
    const result = WizardFieldSchema.safeParse({
      type: 'priority-matrix',
      id: 'priority',
      label: 'Priority',
      priorities: ['A', 'B', 'C', 'D', 'E'],
      choices: ['metatype', 'attributes', 'magic', 'skills', 'resources'],
    })
    expect(result.success).toBe(true)
  })

  it('derived field is valid', () => {
    const result = WizardFieldSchema.safeParse({
      type: 'derived',
      id: 'initiative',
      label: 'Initiative',
      formula: 'reaction + intuition',
    })
    expect(result.success).toBe(true)
  })

  it('custom field is valid', () => {
    const result = WizardFieldSchema.safeParse({
      type: 'custom',
      id: 'gear-picker',
      label: 'Starting Gear',
      componentId: 'GearPickerComponent',
    })
    expect(result.success).toBe(true)
  })

  it('unknown field type is rejected', () => {
    const result = WizardFieldSchema.safeParse({
      type: 'unknown-type',
      id: 'x',
      label: 'X',
    })
    expect(result.success).toBe(false)
  })

  it('forma with all 7 field types in a single step passes', () => {
    const result = FormaSchema.safeParse({
      ...validForma,
      creationSteps: [
        {
          id: 'step-1',
          label: 'All Fields',
          fields: [
            { type: 'text', id: 'f-text', label: 'Text' },
            { type: 'number', id: 'f-number', label: 'Number', min: 1, max: 10 },
            { type: 'select', id: 'f-select', label: 'Select', options: [{ value: 'a', label: 'A' }] },
            { type: 'allocation', id: 'f-alloc', label: 'Alloc', pool: 'points', targets: ['x', 'y'] },
            {
              type: 'priority-matrix',
              id: 'f-prio',
              label: 'Priority',
              priorities: ['A', 'B'],
              choices: ['magic', 'skills'],
            },
            { type: 'derived', id: 'f-derived', label: 'Derived', formula: 'a + b' },
            { type: 'custom', id: 'f-custom', label: 'Custom', componentId: 'MyComp' },
          ],
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('text field missing id is rejected', () => {
    const result = WizardFieldSchema.safeParse({ type: 'text', label: 'Name' })
    expect(result.success).toBe(false)
  })

  it('allocation field missing pool is rejected', () => {
    const result = WizardFieldSchema.safeParse({
      type: 'allocation',
      id: 'alloc',
      label: 'Alloc',
      targets: ['x'],
    })
    expect(result.success).toBe(false)
  })

  it('custom field missing componentId is rejected', () => {
    const result = WizardFieldSchema.safeParse({
      type: 'custom',
      id: 'c',
      label: 'Custom',
    })
    expect(result.success).toBe(false)
  })
})
