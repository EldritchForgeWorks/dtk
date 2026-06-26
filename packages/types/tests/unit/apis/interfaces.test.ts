import { describe, it, expect, expectTypeOf, vi, afterEach } from 'vitest'
import type {
  ActionContext,
  RollResult,
  SequenceExecution,
  AleaApi,
} from '../../../src/apis/alea-api.js'
import type {
  LexContext,
  LexValue,
  ValidationError,
  ValidationResult,
  LexEditorOptions,
  LexApi,
} from '../../../src/apis/lex-api.js'
import type {
  CharacterBuild,
  PurchasedAdvancement,
  ParadigmState,
  OpusApi,
} from '../../../src/apis/opus-api.js'
import type { SystemaApi } from '../../../src/apis/systema-api.js'
import type {
  CompileOptions,
  PromptariumValidationResult,
  PromptariumApi,
} from '../../../src/apis/promptuarium-api.js'
import type { DtkModuleEntry, DtkHubApi } from '../../../src/apis/hub-api.js'
import { getDtkModuleApi, isDtkModuleInstalled } from '../../../src/apis/guards.js'

// ─── AleaApi ──────────────────────────────────────────────────────────────────

describe('AleaApi interface shapes', () => {
  it('RollResult satisfies interface', () => {
    const result = {
      hits: 3,
      opposedHits: null,
      netHits: 3,
      tier: 'hit',
      faces: [5, 6, 2],
      pool: 3,
    } satisfies RollResult
    expectTypeOf(result).toMatchTypeOf<RollResult>()
  })

  it('ActionContext satisfies interface with required fields', () => {
    const ctx = {
      systemId: 'sr6',
      initiatorId: 'actor-1',
      targetIds: ['actor-2'],
    } satisfies ActionContext
    expectTypeOf(ctx).toMatchTypeOf<ActionContext>()
  })

  it('ActionContext satisfies interface with all optional fields', () => {
    const ctx = {
      systemId: 'sr6',
      initiatorId: 'actor-1',
      targetIds: ['actor-2'],
      itemId: 'item-1',
      combatId: 'combat-1',
      stepOutputs: { roll1: null },
    } satisfies ActionContext
    expectTypeOf(ctx).toMatchTypeOf<ActionContext>()
  })

  it('SequenceExecution satisfies interface', () => {
    const exec = {
      sequenceId: 'seq-1',
      exemplarId: 'ex-1',
      stepIndex: 0,
      stepOutputs: {},
      context: { systemId: 'sr6', initiatorId: 'a', targetIds: [] },
      status: 'running' as const,
    } satisfies SequenceExecution
    expectTypeOf(exec).toMatchTypeOf<SequenceExecution>()
  })

  it('SequenceExecution status is a union of three literals', () => {
    type Status = SequenceExecution['status']
    expectTypeOf<'running'>().toMatchTypeOf<Status>()
    expectTypeOf<'suspended'>().toMatchTypeOf<Status>()
    expectTypeOf<'complete'>().toMatchTypeOf<Status>()
  })

  it('AleaApi.isReady is readonly boolean', () => {
    type IsReady = AleaApi['isReady']
    expectTypeOf<IsReady>().toEqualTypeOf<boolean>()
  })

  it('AleaApi.execute returns Promise<SequenceExecution>', () => {
    type Exec = AleaApi['execute']
    expectTypeOf<Exec>().toMatchTypeOf<
      (sequenceId: string, context: ActionContext) => Promise<SequenceExecution>
    >()
  })
})

// ─── LexApi ───────────────────────────────────────────────────────────────────

describe('LexApi interface shapes', () => {
  it('ValidationError satisfies interface', () => {
    const err = { path: 'foo.bar', message: 'required' } satisfies ValidationError
    expectTypeOf(err).toMatchTypeOf<ValidationError>()
  })

  it('ValidationResult satisfies interface', () => {
    const result = { valid: true, errors: [] } satisfies ValidationResult
    expectTypeOf(result).toMatchTypeOf<ValidationResult>()
  })

  it('LexValue covers all valid primitive types', () => {
    expectTypeOf<string>().toMatchTypeOf<LexValue>()
    expectTypeOf<number>().toMatchTypeOf<LexValue>()
    expectTypeOf<boolean>().toMatchTypeOf<LexValue>()
    expectTypeOf<null>().toMatchTypeOf<LexValue>()
  })

  it('LexContext satisfies interface with only required field', () => {
    const ctx = { systemId: 'sr6' } satisfies LexContext
    expectTypeOf(ctx).toMatchTypeOf<LexContext>()
  })

  it('LexEditorOptions satisfies interface', () => {
    const opts = { systemId: 'sr6' } satisfies LexEditorOptions
    expectTypeOf(opts).toMatchTypeOf<LexEditorOptions>()
  })

  it('LexApi.openEditor returns Promise<string | null>', () => {
    type OpenEditor = LexApi['openEditor']
    expectTypeOf<OpenEditor>().toMatchTypeOf<
      (options: LexEditorOptions) => Promise<string | null>
    >()
  })

  it('LexApi.exportCodexJson returns Record<string, string>', () => {
    type Export = LexApi['exportCodexJson']
    expectTypeOf<Export>().toMatchTypeOf<(systemId: string) => Record<string, string>>()
  })
})

// ─── OpusApi ──────────────────────────────────────────────────────────────────

describe('OpusApi interface shapes', () => {
  it('PurchasedAdvancement satisfies interface', () => {
    const adv = { advancementId: 'adv-1', purchasedAt: 1 } satisfies PurchasedAdvancement
    expectTypeOf(adv).toMatchTypeOf<PurchasedAdvancement>()
  })

  it('ParadigmState xp variant satisfies union', () => {
    const state = {
      paradigm: 'xp' as const,
      xpSpent: 10,
      xpTotal: 100,
    } satisfies ParadigmState
    expectTypeOf(state).toMatchTypeOf<ParadigmState>()
  })

  it('ParadigmState milestone variant satisfies union', () => {
    const state = {
      paradigm: 'milestone' as const,
      milestonesRemaining: 3,
    } satisfies ParadigmState
    expectTypeOf(state).toMatchTypeOf<ParadigmState>()
  })

  it('ParadigmState resource variant satisfies union', () => {
    const state = {
      paradigm: 'resource' as const,
      resourceKey: 'gold',
      resourceValue: 50,
    } satisfies ParadigmState
    expectTypeOf(state).toMatchTypeOf<ParadigmState>()
  })

  it('ParadigmState practice variant satisfies union', () => {
    const state = {
      paradigm: 'practice' as const,
      practiceLog: { skill: 3 },
    } satisfies ParadigmState
    expectTypeOf(state).toMatchTypeOf<ParadigmState>()
  })

  it('ParadigmState marks variant satisfies union', () => {
    const state = {
      paradigm: 'marks' as const,
      unspentMarks: 2,
    } satisfies ParadigmState
    expectTypeOf(state).toMatchTypeOf<ParadigmState>()
  })

  it('ParadigmState session variant satisfies union', () => {
    const state = {
      paradigm: 'session' as const,
      advancementsRemaining: 1,
    } satisfies ParadigmState
    expectTypeOf(state).toMatchTypeOf<ParadigmState>()
  })

  it('CharacterBuild satisfies interface', () => {
    const build = {
      systemId: 'sr6',
      steps: {},
      advancements: [],
      paradigmState: { paradigm: 'xp' as const, xpSpent: 0, xpTotal: 100 },
    } satisfies CharacterBuild
    expectTypeOf(build).toMatchTypeOf<CharacterBuild>()
  })

  it('OpusApi.openCreationWizard returns Promise<CharacterBuild | null>', () => {
    type Wizard = OpusApi['openCreationWizard']
    expectTypeOf<Wizard>().toMatchTypeOf<
      (actor: unknown, systemId: string) => Promise<CharacterBuild | null>
    >()
  })
})

// ─── SystemaApi ───────────────────────────────────────────────────────────────

describe('SystemaApi interface shapes', () => {
  it('SystemaApi.version is readonly string', () => {
    type Version = SystemaApi['version']
    expectTypeOf<Version>().toEqualTypeOf<string>()
  })

  it('SystemaApi.isReady is readonly boolean', () => {
    type IsReady = SystemaApi['isReady']
    expectTypeOf<IsReady>().toEqualTypeOf<boolean>()
  })

  it('SystemaApi.defineSystem accepts unknown', () => {
    type DefineSystem = SystemaApi['defineSystem']
    expectTypeOf<DefineSystem>().toMatchTypeOf<(modus: unknown) => void>()
  })
})

// ─── PromptariumApi ───────────────────────────────────────────────────────────

describe('PromptariumApi interface shapes', () => {
  it('CompileOptions satisfies interface with required fields only', () => {
    const opts = {
      exemplarsDir: './exemplars',
      outputDir: './dist',
    } satisfies CompileOptions
    expectTypeOf(opts).toMatchTypeOf<CompileOptions>()
  })

  it('CompileOptions satisfies interface with all fields', () => {
    const opts = {
      exemplarsDir: './exemplars',
      outputDir: './dist',
      codexFile: './codex.json',
      llm: true,
      force: false,
    } satisfies CompileOptions
    expectTypeOf(opts).toMatchTypeOf<CompileOptions>()
  })

  it('PromptariumValidationResult satisfies interface', () => {
    const result = { valid: false, errors: [{ path: 'id', message: 'required' }] } satisfies PromptariumValidationResult
    expectTypeOf(result).toMatchTypeOf<PromptariumValidationResult>()
  })

  it('PromptariumApi.validate returns PromptariumValidationResult', () => {
    type Validate = PromptariumApi['validate']
    expectTypeOf<Validate>().toMatchTypeOf<(exemplar: unknown) => PromptariumValidationResult>()
  })
})

// ─── DtkHubApi ────────────────────────────────────────────────────────────────

describe('DtkHubApi interface shapes', () => {
  it('DtkModuleEntry satisfies interface', () => {
    const entry = {
      id: 'dtk-alea',
      version: '1.0.0',
      api: {},
      ready: true,
    } satisfies DtkModuleEntry
    expectTypeOf(entry).toMatchTypeOf<DtkModuleEntry>()
  })

  it('DtkHubApi.modules is ReadonlyMap<string, DtkModuleEntry>', () => {
    type Modules = DtkHubApi['modules']
    expectTypeOf<Modules>().toMatchTypeOf<ReadonlyMap<string, DtkModuleEntry>>()
  })

  it('DtkHubApi.register accepts Omit<DtkModuleEntry, "ready">', () => {
    type Register = DtkHubApi['register']
    expectTypeOf<Register>().toMatchTypeOf<
      (entry: Omit<DtkModuleEntry, 'ready'>) => void
    >()
  })

  it('DtkHubApi.api<T> returns T | undefined', () => {
    type ApiMethod = DtkHubApi['api']
    expectTypeOf<ApiMethod>().toMatchTypeOf<(moduleId: string) => unknown>()
  })

  it('DtkHubApi.isInstalled returns boolean', () => {
    type IsInstalled = DtkHubApi['isInstalled']
    expectTypeOf<IsInstalled>().toMatchTypeOf<(moduleId: string) => boolean>()
  })
})

// ─── Guards ───────────────────────────────────────────────────────────────────

describe('guards function signatures', () => {
  it('getDtkModuleApi has correct generic signature', () => {
    expectTypeOf(getDtkModuleApi<string>).toMatchTypeOf<(moduleId: string) => string | undefined>()
  })

  it('isDtkModuleInstalled returns boolean', () => {
    expectTypeOf(isDtkModuleInstalled).toMatchTypeOf<(moduleId: string) => boolean>()
  })

  it('getDtkModuleApi returns undefined when no dtk available', () => {
    const result = getDtkModuleApi<AleaApi>('dtk-alea')
    expectTypeOf(result).toMatchTypeOf<AleaApi | undefined>()
  })

  it('isDtkModuleInstalled returns false when no dtk available', () => {
    const result = isDtkModuleInstalled('dtk-alea')
    expectTypeOf(result).toEqualTypeOf<boolean>()
  })
})

// ─── Guards runtime (window stub) ─────────────────────────────────────────────

describe('guards runtime with window.game.dtk stub', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getDtkModuleApi delegates to window.game.dtk.api when dtk is present', () => {
    const mockApi = { isReady: true } as AleaApi
    const mockDtk = {
      api: vi.fn((_id: string) => mockApi),
      isInstalled: vi.fn((_id: string) => true),
      modules: new Map(),
      register: vi.fn(),
    }
    vi.stubGlobal('window', { game: { dtk: mockDtk } })
    const result = getDtkModuleApi<AleaApi>('dtk-alea')
    expect(result).toBe(mockApi)
    expect(mockDtk.api).toHaveBeenCalledWith('dtk-alea')
  })

  it('isDtkModuleInstalled delegates to window.game.dtk.isInstalled when dtk is present', () => {
    const mockDtk = {
      api: vi.fn((_id: string) => undefined),
      isInstalled: vi.fn((_id: string) => true),
      modules: new Map(),
      register: vi.fn(),
    }
    vi.stubGlobal('window', { game: { dtk: mockDtk } })
    const result = isDtkModuleInstalled('dtk-alea')
    expect(result).toBe(true)
    expect(mockDtk.isInstalled).toHaveBeenCalledWith('dtk-alea')
  })

  it('getDtkModuleApi returns undefined when window.game exists but dtk is absent', () => {
    vi.stubGlobal('window', { game: {} })
    const result = getDtkModuleApi<AleaApi>('dtk-alea')
    expect(result).toBeUndefined()
  })

  it('isDtkModuleInstalled returns false when window.game exists but dtk is absent', () => {
    vi.stubGlobal('window', { game: {} })
    const result = isDtkModuleInstalled('dtk-alea')
    expect(result).toBe(false)
  })
})
