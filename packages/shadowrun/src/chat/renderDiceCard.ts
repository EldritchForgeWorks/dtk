// Listens to dtk-alea.step events and renders Shadowrun-flavoured chat cards.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const Hooks: any;
declare const game: any;
declare const ChatMessage: any;
declare const foundry: any;

const CARD_TEMPLATE = 'modules/dtk-shadowrun/templates/dice-card.hbs';

const SR_TIER_LABELS: Record<string, string> = {
  critGlitch:  'CRITICAL GLITCH',
  miss:        'MISS',
  hit:         'HIT',
  strong:      'STRONG HIT',
  exceptional: 'EXCEPTIONAL',
  shaken:      'SHAKEN',
  steady:      'STEADY',
  unflappable: 'UNFLAPPABLE',
  notice:      'NOTICE',
  detail:      'DETAIL',
  pinpoint:    'PINPOINT',
  partial:     'PARTIAL SOAK',
  full:        'FULL SOAK',
  clean:       'CLEAN HACK',
  invisible:   'GHOST MODE',
};

// Steps rolled by the target rather than the initiator
const TARGET_STEPS = new Set(['defense', 'soak', 'resistance', 'drain']);

// Step IDs that represent soak/resistance rolls — display differently.
const SOAK_STEPS = new Set(['soak', 'resistance', 'drain']);

export function listenForDiceStep(): void {
  Hooks.on('dtk-alea.step', async (payload: any) => {
    if (payload.mechanic !== 'pool-count') return;

    const faces: number[]  = payload.faces ?? [];
    const pool             = payload.pool ?? faces.length;
    const hits             = payload.hits ?? 0;
    const ones             = faces.filter((f: number) => f === 1).length;
    const isGlitch         = pool > 0 && ones > pool / 2;
    const isCritGlitch     = isGlitch && hits === 0;

    let tier = payload.tier ?? 'miss';
    if (isCritGlitch) tier = 'critGlitch';

    const faceData = faces.map((v: number) => ({
      value:    v,
      cssClass: v === 1 ? 'glitch' : v >= 5 ? 'hit' : 'miss',
    }));

    const isSoakStep   = SOAK_STEPS.has(payload.stepId ?? '');
    const isTargetStep = TARGET_STEPS.has(payload.stepId ?? '');

    // Damage value (from on_tier consequence, may be negative if soak > DV)
    const rawDamage = payload.damage as number | null | undefined;
    const damage    = rawDamage != null ? Math.max(0, rawDamage) : null;

    // Actor name assignment: target-side steps swap the display roles
    const initiatorName = (payload.initiatorName ?? '') as string;
    const targetName    = (payload.targetName    ?? '') as string;
    const rollerName    = isTargetStep ? targetName    : initiatorName;
    const opposingName  = isTargetStep ? initiatorName : targetName;

    const isAttackStep = (payload.stepId as string) === 'attack';

    const content = await foundry.applications.handlebars.renderTemplate(CARD_TEMPLATE, {
      stepId:       payload.stepId,
      isAttackStep,
      label:        stepLabel(payload.stepId),
      initiatorName,
      targetName,
      rollerName,
      opposingName,
      pool,
      ar:           (payload.ar         as number) || 0,
      dr:           (payload.dr         as number) || 0,
      defensePool:  (payload.defensePool as number) || 0,
      soakPool:     (payload.soakPool   as number) || 0,
      faces:        faceData,
      hits,
      hitsLabel:    `${hits} ${hits === 1 ? 'HIT' : 'HITS'}`,
      ones,
      isGlitch,
      isCritGlitch,
      isSoakStep,
      tier,
      tierLabel:    SR_TIER_LABELS[tier] ?? tier.toUpperCase(),
      damage,
      hasDamage:    damage != null,
      effect:       payload.effect ?? null,
      message:      payload.message ?? null,
      hasAwait:     payload.hasAwait ?? false,
      awaitLabel:   payload.awaitLabel ?? 'Continue',
      awaitSequenceId: payload.awaitSequenceId ?? null,
      awaitChoice:  payload.awaitChoice ?? null,
    });

    await ChatMessage.create({ content });
  });

  // Wire up await buttons whenever a chat message renders
  Hooks.on('renderChatMessage', (_message: any, html: any) => {
    const el: HTMLElement | null = html instanceof HTMLElement ? html : (html[0] ?? null);
    if (!el) return;
    const btn = el.querySelector<HTMLButtonElement>('.sr-card__await-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      const sequenceId = btn.dataset.sequenceId;
      const choice     = btn.dataset.choice;
      if (!sequenceId || !choice) return;
      btn.disabled = true;
      const alea = (game as any).dtk?.getApi?.('dtk-alea');
      if (!alea) return;
      await alea.resume(sequenceId, choice);
    });
  });
}

function stepLabel(stepId: string | undefined): string {
  const labels: Record<string, string> = {
    attack:   'ATTACK',
    defense:  'DEFENSE',
    soak:     'SOAK',
    drain:    'DRAIN',
    cast:     'CAST SPELL',
    crack:    'HACK DEVICE',
    sneak:    'STEALTH',
    con:      'CON',
    perceive: 'PERCEPTION',
    compose:  'COMPOSURE',
  };
  return labels[stepId ?? ''] ?? (stepId?.toUpperCase() ?? 'ROLL');
}
