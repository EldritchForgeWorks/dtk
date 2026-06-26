import type { IActorRepository } from '../../ports/IActorRepository.js'
import type { ITemplateManager, TemplateSpec } from '../../ports/ITemplateManager.js'
import type { IExpressionEvaluator, EvaluationContext } from '../../ports/IExpressionEvaluator.js'
import type { ITargetListener } from '../../ports/ITargetListener.js'
import type { ResolvedTarget } from '../value-objects/ResolvedTarget.js'

export interface TargetingOptions {
  mode: 'token' | 'self' | 'area' | 'none'
  minTargets?: number
  maxTargets?: number
  filter?: string
  templateSpec?: TemplateSpec
  initiatorActorId: string
}

export class TargetingResolver {
  constructor(
    private readonly repo: IActorRepository,
    private readonly templateMgr: ITemplateManager,
    private readonly evaluator: IExpressionEvaluator | null,
    private readonly listener: ITargetListener | null,
  ) {}

  async resolve(opts: TargetingOptions): Promise<ResolvedTarget[]> {
    switch (opts.mode) {
      case 'none':
        return this.resolveNone()
      case 'self':
        return this.resolveSelf(opts.initiatorActorId)
      case 'token':
        return this.resolveToken(opts)
      case 'area':
        return this.resolveArea(opts)
    }
  }

  private resolveNone(): ResolvedTarget[] {
    return []
  }

  private resolveSelf(initiatorActorId: string): ResolvedTarget[] {
    const snapshot = this.repo.getSnapshot(initiatorActorId)
    if (!snapshot) {
      throw new Error(`TargetingResolver: actor not found for self-targeting: "${initiatorActorId}"`)
    }
    return [
      {
        actorId: snapshot.actorId,
        tokenId: snapshot.tokenId ?? initiatorActorId,
        snapshot,
      },
    ]
  }

  private async resolveToken(opts: TargetingOptions): Promise<ResolvedTarget[]> {
    if (!this.listener) return []

    const min = opts.minTargets ?? 1
    const max = opts.maxTargets ?? 1
    const tokenIds = await this.listener.waitForTokenTargets(min, max)

    const results: ResolvedTarget[] = []
    for (const tokenId of tokenIds) {
      const snapshot = this.repo.getTokenSnapshot(tokenId)
      if (snapshot) {
        results.push({
          actorId: snapshot.actorId,
          tokenId,
          snapshot,
        })
      }
    }

    if (opts.filter && this.evaluator) {
      return this.applyFilter(results, opts.filter, this.evaluator)
    }

    return results
  }

  private async resolveArea(opts: TargetingOptions): Promise<ResolvedTarget[]> {
    const spec = opts.templateSpec
    if (!spec) return []

    const templateId = await this.templateMgr.create(spec)
    await this.templateMgr.waitForPlacement()

    const tokenIds = this.repo.getTokenIdsInTemplate(templateId)
    await this.templateMgr.delete(templateId)

    const results: ResolvedTarget[] = []
    for (const tokenId of tokenIds) {
      const snapshot = this.repo.getTokenSnapshot(tokenId)
      if (snapshot) {
        results.push({
          actorId: snapshot.actorId,
          tokenId,
          snapshot,
        })
      }
    }

    if (opts.filter && this.evaluator) {
      return this.applyFilter(results, opts.filter, this.evaluator)
    }

    return results
  }

  private applyFilter(
    candidates: ResolvedTarget[],
    filter: string,
    evaluator: IExpressionEvaluator,
  ): ResolvedTarget[] {
    return candidates.filter((target) => {
      const ctx: EvaluationContext = {
        actor: target.snapshot.system as Record<string, unknown>,
      }
      return Boolean(evaluator.evaluate(filter, ctx))
    })
  }
}
