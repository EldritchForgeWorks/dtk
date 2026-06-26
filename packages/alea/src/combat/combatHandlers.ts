import type { ICombatStateStore } from '../ports/ICombatStateStore.js';
import type { AleaApi } from '../AleaApi.js';

export function makeCombatTurnHandler(
  api: AleaApi,
  store: ICombatStateStore,
): (combat: unknown, current: unknown) => Promise<void> {
  return async (_combat: unknown, current: unknown) => {
    const c = current as { actorId?: string } | null;
    if (!c?.actorId) return;

    const execution = await store.loadByActorId(c.actorId);
    if (!execution || execution.status !== 'queued') return;

    await api.execute(execution.context);
  };
}

export function makeCombatRoundHandler(
  store: ICombatStateStore,
): (combat: unknown) => Promise<void> {
  return async (_combat: unknown) => {
    await store.clearQueued();
  };
}
