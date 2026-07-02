import { ExemplarSchema } from '@eldritchforgeworks/dtk-types/exemplar';
import type { Exemplar } from '@eldritchforgeworks/dtk-types/exemplar';
import type { IExemplarSource } from '../../ports/IExemplarSource.js';
import type { ValidationError, ValidationResult } from '../value-objects/ValidationError.js';
import { ExemplarCorpus } from '../entities/ExemplarCorpus.js';

function idFromRaw(data: unknown): string {
  if (data && typeof data === 'object' && 'id' in data && typeof (data as Record<string, unknown>)['id'] === 'string') {
    return (data as Record<string, unknown>)['id'] as string;
  }
  return '(unknown)';
}

export class CorpusValidator {
  async validate(source: IExemplarSource): Promise<{ corpus: ExemplarCorpus; result: ValidationResult }> {
    const rawList = await source.list();
    const errors: ValidationError[] = [];
    const corpus = new ExemplarCorpus();

    // Pass 1: schema validation
    const validPairs: Array<{ exemplar: Exemplar; filePath: string }> = [];
    for (const raw of rawList) {
      const result = ExemplarSchema.safeParse(raw.data);
      if (!result.success) {
        const exemplarId = idFromRaw(raw.data);
        for (const issue of result.error.issues) {
          errors.push({
            exemplarId,
            filePath: raw.filePath,
            field: issue.path.join('.') || '(root)',
            message: issue.message,
            phase: 'schema',
          });
        }
      } else {
        validPairs.push({ exemplar: result.data, filePath: raw.filePath });
      }
    }

    // Build corpus from valid entries
    const idToFilePath = new Map<string, string>();
    for (const { exemplar, filePath } of validPairs) {
      try {
        corpus.add(exemplar);
        idToFilePath.set(exemplar.id, filePath);
      } catch {
        // duplicate id — will be caught in pass 3
      }
    }

    // Early exit: skip cross-ref and uniqueness if schema errors exist
    if (errors.length > 0) {
      return { corpus, result: { valid: false, errors } };
    }

    // Pass 2: cross-reference checks
    for (const { exemplar, filePath } of validPairs) {
      if (exemplar.kind === 'discipline' || exemplar.kind === 'vocation') {
        const parent = (exemplar as { parent?: string }).parent;
        if (parent !== undefined) {
          const parentEntry = corpus.get(parent);
          if (!parentEntry) {
            errors.push({
              exemplarId: exemplar.id,
              filePath,
              field: 'parent',
              message: `referenced id '${parent}' not found in corpus`,
              phase: 'cross-reference',
            });
          } else if (exemplar.kind === 'discipline' && parentEntry.kind !== 'archetype') {
            errors.push({
              exemplarId: exemplar.id,
              filePath,
              field: 'parent',
              message: `parent '${parent}' must be kind 'archetype' but is '${parentEntry.kind}'`,
              phase: 'cross-reference',
            });
          } else if (exemplar.kind === 'vocation' && parentEntry.kind !== 'discipline') {
            errors.push({
              exemplarId: exemplar.id,
              filePath,
              field: 'parent',
              message: `parent '${parent}' must be kind 'discipline' but is '${parentEntry.kind}'`,
              phase: 'cross-reference',
            });
          }
        }
      }

      if (exemplar.kind === 'action') {
        const seqId = exemplar.sequence;
        const seqEntry = corpus.get(seqId);
        if (!seqEntry) {
          errors.push({
            exemplarId: exemplar.id,
            filePath,
            field: 'sequence',
            message: `referenced sequence id '${seqId}' not found in corpus`,
            phase: 'cross-reference',
          });
        } else if (seqEntry.kind !== 'sequence') {
          errors.push({
            exemplarId: exemplar.id,
            filePath,
            field: 'sequence',
            message: `referenced id '${seqId}' must be kind 'sequence' but is '${seqEntry.kind}'`,
            phase: 'cross-reference',
          });
        }
      }

      if (exemplar.kind === 'sequence') {
        for (let i = 0; i < exemplar.steps.length; i++) {
          const step = exemplar.steps[i];
          if (step.rule !== undefined) {
            const ruleEntry = corpus.get(step.rule);
            if (!ruleEntry) {
              errors.push({
                exemplarId: exemplar.id,
                filePath,
                field: `steps.${i}.rule`,
                message: `referenced rule id '${step.rule}' not found in corpus`,
                phase: 'cross-reference',
              });
            } else if (ruleEntry.kind !== 'rule') {
              errors.push({
                exemplarId: exemplar.id,
                filePath,
                field: `steps.${i}.rule`,
                message: `referenced id '${step.rule}' must be kind 'rule' but is '${ruleEntry.kind}'`,
                phase: 'cross-reference',
              });
            }
          }
        }
      }
    }

    // Pass 3: id uniqueness
    const idToFiles = new Map<string, string[]>();
    for (const { exemplar, filePath } of validPairs) {
      const files = idToFiles.get(exemplar.id) ?? [];
      files.push(filePath);
      idToFiles.set(exemplar.id, files);
    }
    for (const [id, files] of idToFiles) {
      if (files.length > 1) {
        for (const filePath of files) {
          errors.push({
            exemplarId: id,
            filePath,
            field: 'id',
            message: `duplicate id '${id}'`,
            phase: 'uniqueness',
          });
        }
      }
    }

    return {
      corpus,
      result: { valid: errors.length === 0, errors },
    };
  }
}
