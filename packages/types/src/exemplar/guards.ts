import { ExemplarSchema, type Exemplar } from './schema.js'
import {
  SpeciesExemplarSchema,
  ArchetypeExemplarSchema,
  DisciplineExemplarSchema,
  VocationExemplarSchema,
  ItemExemplarSchema,
  BackgroundExemplarSchema,
  OriginExemplarSchema,
  FeatureExemplarSchema,
  type SpeciesExemplar,
  type ArchetypeExemplar,
  type DisciplineExemplar,
  type VocationExemplar,
  type ItemExemplar,
  type BackgroundExemplar,
  type OriginExemplar,
  type FeatureExemplar,
} from './kinds/class-layer.js'
import { RuleExemplarSchema, type RuleExemplar } from './kinds/rule.js'
import { SequenceExemplarSchema, type SequenceExemplar } from './kinds/sequence.js'
import { ActionExemplarSchema, type ActionExemplar } from './kinds/action.js'

export function isExemplar(value: unknown): value is Exemplar {
  return ExemplarSchema.safeParse(value).success
}

export function isSpecies(value: unknown): value is SpeciesExemplar {
  return SpeciesExemplarSchema.safeParse(value).success
}

export function isArchetype(value: unknown): value is ArchetypeExemplar {
  return ArchetypeExemplarSchema.safeParse(value).success
}

export function isDiscipline(value: unknown): value is DisciplineExemplar {
  return DisciplineExemplarSchema.safeParse(value).success
}

export function isVocation(value: unknown): value is VocationExemplar {
  return VocationExemplarSchema.safeParse(value).success
}

export function isItem(value: unknown): value is ItemExemplar {
  return ItemExemplarSchema.safeParse(value).success
}

export function isBackground(value: unknown): value is BackgroundExemplar {
  return BackgroundExemplarSchema.safeParse(value).success
}

export function isOrigin(value: unknown): value is OriginExemplar {
  return OriginExemplarSchema.safeParse(value).success
}

export function isFeature(value: unknown): value is FeatureExemplar {
  return FeatureExemplarSchema.safeParse(value).success
}

export function isRule(value: unknown): value is RuleExemplar {
  return RuleExemplarSchema.safeParse(value).success
}

export function isSequence(value: unknown): value is SequenceExemplar {
  return SequenceExemplarSchema.safeParse(value).success
}

export function isAction(value: unknown): value is ActionExemplar {
  return ActionExemplarSchema.safeParse(value).success
}
