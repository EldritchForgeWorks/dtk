import { createHash } from 'node:crypto';
import type { Exemplar, RuleExemplar, SequenceExemplar, ActionExemplar } from '@eldritchforgeworks/dtk-types/exemplar';
import type { ICodexProvider } from '../../ports/ICodexProvider.js';
import type { ILLMClient } from '../../ports/ILLMClient.js';
import type { ExemplarCorpus } from '../entities/ExemplarCorpus.js';
import type { GeneratedDescription } from '../value-objects/GeneratedDescription.js';

export const CACHE_VERSION = 1;

export interface CacheEntry {
  readonly contentHash: string;
  readonly text: string;
  readonly polished: boolean;
}

export interface DescriptionCache {
  version: number;
  entries: Record<string, CacheEntry>;
}

export interface NLGeneratorOptions {
  readonly useLlm: boolean;
  readonly force?: boolean;
  readonly cacheFilePath?: string;
}

type GenerableExemplar = RuleExemplar | SequenceExemplar | ActionExemplar;

function isGenerable(e: Exemplar): e is GenerableExemplar {
  return e.kind === 'rule' || e.kind === 'sequence' || e.kind === 'action';
}

function computeContentHash(exemplar: Exemplar): string {
  return createHash('sha1').update(JSON.stringify(exemplar)).digest('hex');
}

function renderRule(exemplar: RuleExemplar, codex: ICodexProvider): string {
  const pool = codex.resolveSlug(exemplar.pool) || exemplar.pool;
  const ritus = codex.resolveSlug(exemplar.ritus) || exemplar.ritus;
  const tierLines = exemplar.on_tier
    ? Object.entries(exemplar.on_tier)
        .map(([tier, consequence]) => {
          const parts: string[] = [];
          if (consequence.damage !== undefined) parts.push(`${consequence.damage} damage`);
          if (consequence.effect) parts.push(consequence.effect);
          if (consequence.chat) parts.push(consequence.chat);
          return `On a ${tier}: ${parts.length > 0 ? parts.join(', ') : 'no effect'}.`;
        })
        .join(' ')
    : '';
  return `Roll ${pool} against ${ritus}. ${tierLines}`.trim();
}

function renderSequence(exemplar: SequenceExemplar, codex: ICodexProvider): string {
  const count = exemplar.steps.length;
  const stepList = exemplar.steps
    .map(s => {
      const ref = s.rule ?? s.sequence ?? s.id;
      const resolved = codex.resolveSlug(ref) || ref;
      return s.actor ? `${s.actor} performs ${resolved}` : resolved;
    })
    .join(', ');
  const suffix = count > 0 ? `: ${stepList}` : '';
  return `A sequence of ${count} step${count !== 1 ? 's' : ''}${suffix}.`;
}

function renderAction(exemplar: ActionExemplar, codex: ICodexProvider): string {
  const seqName = codex.resolveSlug(exemplar.sequence) || exemplar.sequence;
  const costParts: string[] = [];
  if (exemplar.cost?.actionPoints) costParts.push(`${exemplar.cost.actionPoints} AP`);
  if (exemplar.cost?.bonusActions) costParts.push(`${exemplar.cost.bonusActions} bonus`);
  if (exemplar.cost?.reactions) costParts.push(`${exemplar.cost.reactions} reaction`);
  const costStr = costParts.length > 0 ? costParts.join(', ') : 'none';
  return `${exemplar.name}: ${seqName}. Costs: ${costStr}.`;
}

function renderTemplate(exemplar: GenerableExemplar, codex: ICodexProvider): string {
  switch (exemplar.kind) {
    case 'rule': return renderRule(exemplar, codex);
    case 'sequence': return renderSequence(exemplar, codex);
    case 'action': return renderAction(exemplar, codex);
  }
}

export class NLGenerator {
  constructor(
    private readonly codex: ICodexProvider,
    private readonly llm: ILLMClient,
  ) {}

  async generate(
    exemplar: GenerableExemplar,
    cache: DescriptionCache | undefined,
    opts: NLGeneratorOptions,
  ): Promise<GeneratedDescription> {
    const contentHash = computeContentHash(exemplar);

    // Cache hit check (only valid if version matches and not force-regenerating)
    if (!opts.force && cache && cache.version === CACHE_VERSION) {
      const entry = cache.entries[exemplar.id];
      if (entry && entry.contentHash === contentHash) {
        return {
          exemplarId: exemplar.id,
          text: entry.text,
          cached: true,
          polished: entry.polished,
        };
      }
    }

    const baseText = renderTemplate(exemplar, this.codex);
    let text = baseText;
    let polished = false;

    if (opts.useLlm) {
      text = await this.llm.polish(baseText, exemplar.kind);
      polished = true;
    }

    // Update cache
    if (cache) {
      cache.entries[exemplar.id] = { contentHash, text, polished };
    }

    return {
      exemplarId: exemplar.id,
      text,
      cached: false,
      polished,
    };
  }

  async generateAll(
    corpus: ExemplarCorpus,
    opts: NLGeneratorOptions,
    cache?: DescriptionCache,
  ): Promise<GeneratedDescription[]> {
    const results: GeneratedDescription[] = [];
    for (const exemplar of corpus.entries()) {
      if (isGenerable(exemplar)) {
        if (!opts.force && exemplar.description !== undefined) {
          continue; // skip exemplars that already have a description unless --force
        }
        const desc = await this.generate(exemplar, cache, opts);
        results.push(desc);
      }
    }
    return results;
  }
}
