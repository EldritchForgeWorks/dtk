export interface SafeParseSuccess<T> {
  success: true;
  data: T;
}

export interface SafeParseError {
  success: false;
  error: {
    issues: Array<{ path: (string | number)[]; message: string }>;
  };
}

export type SafeParseResult<T> = SafeParseSuccess<T> | SafeParseError;

export type ExemplarKind =
  | 'rule'
  | 'sequence'
  | 'action'
  | 'species'
  | 'discipline'
  | 'archetype'
  | 'vocation';

interface BaseExemplar {
  readonly id: string;
  readonly kind: ExemplarKind;
  readonly slug: string;
  readonly name: string;
  readonly description?: string;
}

export interface TierConsequence {
  readonly damage?: number;
  readonly effect?: string;
  readonly message?: string;
}

export interface SequenceStep {
  readonly actor: string;
  readonly rule: string;
}

export interface RuleExemplar extends BaseExemplar {
  readonly kind: 'rule';
  readonly pool: { readonly dice: number; readonly attribute: string };
  readonly ritus: string;
  readonly on_tier: Readonly<Record<string, TierConsequence>>;
}

export interface SequenceExemplar extends BaseExemplar {
  readonly kind: 'sequence';
  readonly steps: readonly SequenceStep[];
  readonly cost: string;
}

export interface ActionExemplar extends BaseExemplar {
  readonly kind: 'action';
  readonly sequence: string;
  readonly cost: string;
}

export interface SpeciesExemplar extends BaseExemplar {
  readonly kind: 'species';
  readonly traits: readonly string[];
}

export interface ArchetypeExemplar extends BaseExemplar {
  readonly kind: 'archetype';
}

export interface DisciplineExemplar extends BaseExemplar {
  readonly kind: 'discipline';
  readonly parent?: string;
  readonly actions?: readonly string[];
}

export interface VocationExemplar extends BaseExemplar {
  readonly kind: 'vocation';
  readonly parent?: string;
}

export type Exemplar =
  | RuleExemplar
  | SequenceExemplar
  | ActionExemplar
  | SpeciesExemplar
  | ArchetypeExemplar
  | DisciplineExemplar
  | VocationExemplar;

type Issue = { path: (string | number)[]; message: string };

function fail(issues: Issue[]): SafeParseError {
  return { success: false, error: { issues } };
}

function requireString(obj: Record<string, unknown>, field: string, issues: Issue[]): void {
  if (typeof obj[field] !== 'string' || (obj[field] as string).length === 0) {
    issues.push({ path: [field], message: `${field} must be a non-empty string` });
  }
}

function validateBase(obj: Record<string, unknown>, issues: Issue[]): void {
  requireString(obj, 'id', issues);
  requireString(obj, 'slug', issues);
  requireString(obj, 'name', issues);
  if (obj['description'] !== undefined && typeof obj['description'] !== 'string') {
    issues.push({ path: ['description'], message: 'description must be a string if present' });
  }
}

function validateRule(obj: Record<string, unknown>): SafeParseResult<RuleExemplar> {
  const issues: Issue[] = [];
  validateBase(obj, issues);
  if (!obj['pool'] || typeof obj['pool'] !== 'object' || Array.isArray(obj['pool'])) {
    issues.push({ path: ['pool'], message: 'pool must be an object' });
  } else {
    const pool = obj['pool'] as Record<string, unknown>;
    if (typeof pool['dice'] !== 'number') {
      issues.push({ path: ['pool', 'dice'], message: 'pool.dice must be a number' });
    }
    if (typeof pool['attribute'] !== 'string') {
      issues.push({ path: ['pool', 'attribute'], message: 'pool.attribute must be a string' });
    }
  }
  requireString(obj, 'ritus', issues);
  if (!obj['on_tier'] || typeof obj['on_tier'] !== 'object' || Array.isArray(obj['on_tier'])) {
    issues.push({ path: ['on_tier'], message: 'on_tier must be an object' });
  }
  if (issues.length > 0) return fail(issues);
  return { success: true, data: obj as unknown as RuleExemplar };
}

function validateSequence(obj: Record<string, unknown>): SafeParseResult<SequenceExemplar> {
  const issues: Issue[] = [];
  validateBase(obj, issues);
  if (!Array.isArray(obj['steps'])) {
    issues.push({ path: ['steps'], message: 'steps must be an array' });
  }
  requireString(obj, 'cost', issues);
  if (issues.length > 0) return fail(issues);
  return { success: true, data: obj as unknown as SequenceExemplar };
}

function validateAction(obj: Record<string, unknown>): SafeParseResult<ActionExemplar> {
  const issues: Issue[] = [];
  validateBase(obj, issues);
  requireString(obj, 'sequence', issues);
  requireString(obj, 'cost', issues);
  if (issues.length > 0) return fail(issues);
  return { success: true, data: obj as unknown as ActionExemplar };
}

function validateSpecies(obj: Record<string, unknown>): SafeParseResult<SpeciesExemplar> {
  const issues: Issue[] = [];
  validateBase(obj, issues);
  if (!Array.isArray(obj['traits'])) {
    issues.push({ path: ['traits'], message: 'traits must be an array' });
  }
  if (issues.length > 0) return fail(issues);
  return { success: true, data: obj as unknown as SpeciesExemplar };
}

function validateArchetype(obj: Record<string, unknown>): SafeParseResult<ArchetypeExemplar> {
  const issues: Issue[] = [];
  validateBase(obj, issues);
  if (issues.length > 0) return fail(issues);
  return { success: true, data: obj as unknown as ArchetypeExemplar };
}

function validateDiscipline(obj: Record<string, unknown>): SafeParseResult<DisciplineExemplar> {
  const issues: Issue[] = [];
  validateBase(obj, issues);
  if (issues.length > 0) return fail(issues);
  return { success: true, data: obj as unknown as DisciplineExemplar };
}

function validateVocation(obj: Record<string, unknown>): SafeParseResult<VocationExemplar> {
  const issues: Issue[] = [];
  validateBase(obj, issues);
  if (issues.length > 0) return fail(issues);
  return { success: true, data: obj as unknown as VocationExemplar };
}

export const ExemplarSchema = {
  safeParse(input: unknown): SafeParseResult<Exemplar> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return fail([{ path: [], message: 'input must be an object' }]);
    }
    const obj = input as Record<string, unknown>;
    const kind = obj['kind'];
    if (typeof kind !== 'string') {
      return fail([{ path: ['kind'], message: 'kind must be a string' }]);
    }
    switch (kind) {
      case 'rule': return validateRule(obj);
      case 'sequence': return validateSequence(obj);
      case 'action': return validateAction(obj);
      case 'species': return validateSpecies(obj);
      case 'archetype': return validateArchetype(obj);
      case 'discipline': return validateDiscipline(obj);
      case 'vocation': return validateVocation(obj);
      default:
        return fail([{ path: ['kind'], message: `unknown kind: ${kind}` }]);
    }
  },
};
