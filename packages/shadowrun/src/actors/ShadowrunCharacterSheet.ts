// Foundry adapter — requires live Foundry VTT environment.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const foundry: any;
declare const game: any;
declare const ChatMessage: any;
declare const Roll: any;

// SR 6e skill definitions: key → { label, linkedAttr }
const SKILLS: Record<string, { label: string; attr: string }> = {
  athletics:     { label: 'Athletics',       attr: 'agility' },
  biotech:       { label: 'Biotech',         attr: 'logic' },
  closeCombat:   { label: 'Close Combat',    attr: 'agility' },
  con:           { label: 'Con',             attr: 'charisma' },
  cracking:      { label: 'Cracking',        attr: 'logic' },
  electronics:   { label: 'Electronics',     attr: 'logic' },
  engineering:   { label: 'Engineering',     attr: 'logic' },
  exoticWeapons: { label: 'Exotic Weapons',  attr: 'agility' },
  firearms:      { label: 'Firearms',        attr: 'agility' },
  influence:     { label: 'Influence',       attr: 'charisma' },
  outdoors:      { label: 'Outdoors',        attr: 'intuition' },
  perception:    { label: 'Perception',      attr: 'intuition' },
  piloting:      { label: 'Piloting',        attr: 'reaction' },
  stealth:       { label: 'Stealth',         attr: 'agility' },
  // Awakened
  astral:        { label: 'Astral',          attr: 'intuition' },
  sorcery:       { label: 'Sorcery',         attr: 'magic' },
  // Emerged
  tasking:       { label: 'Tasking',         attr: 'resonance' },
};

const CORE_ATTRS = [
  { key: 'body',      label: 'BOD' },
  { key: 'agility',   label: 'AGI' },
  { key: 'reaction',  label: 'REA' },
  { key: 'strength',  label: 'STR' },
  { key: 'willpower', label: 'WIL' },
  { key: 'logic',     label: 'LOG' },
  { key: 'intuition', label: 'INT' },
  { key: 'charisma',  label: 'CHA' },
];

const METATYPES = ['Human', 'Elf', 'Dwarf', 'Ork', 'Troll'];

const ATTR_ABBR: Record<string, string> = {
  body: 'BOD', agility: 'AGI', reaction: 'REA', strength: 'STR',
  willpower: 'WIL', logic: 'LOG', intuition: 'INT', charisma: 'CHA',
  magic: 'MAG', resonance: 'RES',
};

const CARD_TEMPLATE = 'modules/dtk-shadowrun/templates/dice-card.hbs';

const SR_TIER_LABELS: Record<string, string> = {
  critGlitch: 'CRITICAL GLITCH',
  miss:       'MISS',
  hit:        'HIT',
  strong:     'STRONG HIT',
  exceptional: 'EXCEPTIONAL',
  // sequence-specific labels
  shaken:     'SHAKEN',
  steady:     'STEADY',
  unflappable: 'UNFLAPPABLE',
  notice:     'NOTICE',
  detail:     'DETAIL',
  pinpoint:   'PINPOINT',
  partial:    'PARTIAL SOAK',
  full:       'FULL SOAK',
  clean:      'CLEAN',
  invisible:  'GHOST',
  access:     'ACCESS',
};

// ── Sequence metadata for the sheet UI ──────────────────────────

interface SequenceButton {
  id: string;
  label: string;
  group: 'combat' | 'magic' | 'matrix' | 'social' | 'general';
  needsTarget: boolean;
}

const SEQUENCE_BUTTONS: SequenceButton[] = [
  { id: 'sr.ranged-attack',  label: 'Ranged Attack',   group: 'combat',   needsTarget: true },
  { id: 'sr.close-combat',   label: 'Close Combat',    group: 'combat',   needsTarget: true },
  { id: 'sr.direct-spell',   label: 'Direct Spell',    group: 'magic',    needsTarget: true },
  { id: 'sr.hacking-crack',  label: 'Hack Device',     group: 'matrix',   needsTarget: false },
  { id: 'sr.stealth',        label: 'Stealth',         group: 'general',  needsTarget: true },
  { id: 'sr.con',            label: 'Con',             group: 'social',   needsTarget: true },
  { id: 'sr.perception',     label: 'Perception',      group: 'general',  needsTarget: false },
  { id: 'sr.composure',      label: 'Composure',       group: 'general',  needsTarget: false },
];

// ── Sheet class ──────────────────────────────────────────────────

export class ShadowrunCharacterSheet extends (foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.DocumentSheetV2,
)) {
  static DEFAULT_OPTIONS = {
    classes: ['dtk-app', 'sr-sheet'],
    window: { resizable: true },
    position: { width: 820, height: 700 },
    actions: {
      rollAttr:      ShadowrunCharacterSheet._onRollAttr,
      rollSkill:     ShadowrunCharacterSheet._onRollSkill,
      runSequence:   ShadowrunCharacterSheet._onRunSequence,
      togglePhysBox: ShadowrunCharacterSheet._onTogglePhysBox,
      toggleStunBox: ShadowrunCharacterSheet._onToggleStunBox,
    },
  };

  static PARTS = {
    sheet: { template: 'modules/dtk-shadowrun/templates/character-sheet.hbs' },
  };

  async _prepareContext(_options: any): Promise<any> {
    const actor = this.document as any;
    const sys   = actor.system;

    const attrs = CORE_ATTRS.map(({ key, label }) => ({
      key, label, value: sys[key] ?? 1,
    }));

    const physMonitor = sys.physicalMonitor ?? 10;
    const stunMonitor = sys.stunMonitor    ?? 10;

    // Build skill rows — show only skills with rank > 0, or always show all
    const skillRows = Object.entries(SKILLS).map(([key, def]) => ({
      key,
      label:     def.label,
      attrAbbr:  ATTR_ABBR[def.attr] ?? def.attr.toUpperCase(),
      attrKey:   def.attr,
      rank:      (sys.skills?.[key] ?? 0) as number,
      attrVal:   (sys[def.attr] ?? 0) as number,
    }));

    // Sequence button groups
    const seqGroups = [
      { label: 'Combat',  key: 'combat'  },
      { label: 'Magic',   key: 'magic'   },
      { label: 'Matrix',  key: 'matrix'  },
      { label: 'Social',  key: 'social'  },
      { label: 'General', key: 'general' },
    ].map((g) => ({
      ...g,
      sequences: SEQUENCE_BUTTONS.filter((b) => b.group === g.key),
    })).filter((g) => g.sequences.length > 0);

    return {
      actor,
      name:        actor.name,
      streetName:  sys.streetName,
      metatype:    sys.metatype,
      archetype:   sys.archetype,
      metatypes:   METATYPES.map((m) => ({ value: m, selected: m === sys.metatype })),
      attrs,
      ar:           sys.ar ?? 0,
      dr:           sys.dr ?? 0,
      edge:         sys.edge,
      edgeCurrent:  sys.edgeCurrent,
      essence:      (sys.essence as number)?.toFixed(1) ?? '6.0',
      magic:        sys.magic,
      resonance:    sys.resonance,
      initiative:   sys.initiative,
      composure:    sys.composure,
      judgeIntentions: sys.judgeIntentions,
      physMonitor,
      stunMonitor,
      physDamage:   sys.physicalDamage,
      stunDamage:   sys.stunDamage,
      physBoxes:    Array.from({ length: physMonitor }, (_, i) => ({
        index: i, filled: i < sys.physicalDamage,
      })),
      stunBoxes:    Array.from({ length: stunMonitor }, (_, i) => ({
        index: i, filled: i < sys.stunDamage,
      })),
      skillRows,
      seqGroups,
      notes: sys.notes,
    };
  }

  // ── Action: roll a raw attribute ───────────────────────────────

  static async _onRollAttr(this: ShadowrunCharacterSheet, _e: Event, t: HTMLElement): Promise<void> {
    const key   = t.dataset.attr!;
    const label = t.dataset.label ?? key;
    const pool  = (this.document as any).system[key] ?? 1;
    await this._rollPool(pool, label);
  }

  // ── Action: roll a skill (rank + linked attribute) ─────────────

  static async _onRollSkill(this: ShadowrunCharacterSheet, _e: Event, t: HTMLElement): Promise<void> {
    const key  = t.dataset.skill!;
    const sys  = (this.document as any).system;
    const def  = SKILLS[key];
    if (!def) return;
    const rank  = (sys.skills?.[key] ?? 0) as number;
    const attr  = (sys[def.attr] ?? 0) as number;
    const pool  = rank + attr;
    await this._rollPool(pool, def.label);
  }

  // ── Action: execute a multi-step sequence via dtk-alea ─────────

  static async _onRunSequence(this: ShadowrunCharacterSheet, _e: Event, t: HTMLElement): Promise<void> {
    const seqId = t.dataset.sequence!;

    const alea = (game as any).dtk?.getApi?.('dtk-alea');
    if (!alea?.isReady?.()) {
      console.warn('[dtk-shadowrun] dtk-alea not ready — cannot run sequence.');
      (game as any).ui?.notifications?.warn('dtk-alea unavailable. Sequences require dtk-alea.');
      return;
    }

    const actorId   = ((this.document as any).id) as string;
    const targetIds = [...((game as any).user.targets as Set<any>)]
      .map((token: any) => token.actor?.id as string | undefined)
      .filter((id): id is string => typeof id === 'string');

    await alea.executeBySystemId(seqId, actorId, targetIds);
  }

  // ── Action: toggle damage monitor boxes ────────────────────────

  static async _onTogglePhysBox(this: ShadowrunCharacterSheet, _e: Event, t: HTMLElement): Promise<void> {
    const idx     = parseInt(t.dataset.index ?? '0', 10);
    const current = (this.document as any).system.physicalDamage ?? 0;
    await (this.document as any).update({ 'system.physicalDamage': current === idx + 1 ? idx : idx + 1 });
  }

  static async _onToggleStunBox(this: ShadowrunCharacterSheet, _e: Event, t: HTMLElement): Promise<void> {
    const idx     = parseInt(t.dataset.index ?? '0', 10);
    const current = (this.document as any).system.stunDamage ?? 0;
    await (this.document as any).update({ 'system.stunDamage': current === idx + 1 ? idx : idx + 1 });
  }

  // ── Direct pool roll (no sequence) ────────────────────────────

  async _rollPool(pool: number, label: string): Promise<void> {
    const actor    = this.document as any;
    const safePool = Math.max(1, pool);
    const roll     = new Roll(`${safePool}d6`);
    await roll.evaluate();

    const faces: number[] = (roll.dice[0]?.results ?? []).map((r: any) => r.result as number);
    const hits         = faces.filter((f) => f >= 5).length;
    const ones         = faces.filter((f) => f === 1).length;
    const isGlitch     = ones > safePool / 2;
    const isCritGlitch = isGlitch && hits === 0;

    let tier: string;
    if (isCritGlitch)   tier = 'critGlitch';
    else if (hits >= 6) tier = 'exceptional';
    else if (hits >= 4) tier = 'strong';
    else if (hits >= 1) tier = 'hit';
    else                tier = 'miss';

    const content = await foundry.applications.handlebars.renderTemplate(CARD_TEMPLATE, {
      actorName:   actor.name,
      label,
      pool:        safePool,
      faces:       faces.map((v) => ({ value: v, cssClass: v === 1 ? 'glitch' : v >= 5 ? 'hit' : 'miss' })),
      hits,
      hitsLabel:   `${hits} ${hits === 1 ? 'HIT' : 'HITS'}`,
      ones,
      isGlitch,
      isCritGlitch,
      tier,
      tierLabel:   SR_TIER_LABELS[tier] ?? tier,
    });

    await ChatMessage.create({
      content,
      speaker: ChatMessage.getSpeaker({ actor }),
      rolls: [roll],
    });
  }
}
