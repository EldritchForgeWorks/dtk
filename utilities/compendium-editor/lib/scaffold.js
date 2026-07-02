function toPascalCase(s) {
  return String(s).replace(/(^|[-_\s]+)([a-z0-9])/gi, (_, __, c) => c.toUpperCase())
}

function initiativeFormula(dice0) {
  const s = dice0.sides || 20
  switch (dice0.mechanic) {
    case 'single-die':    return `1d${s}`
    case 'roll-over':     return `1d${s}`
    case 'roll-under':    return `1d${s}`
    case 'roll-plus-mod': return `1d${s} + 0`
    case 'pool-count':
    case 'pool-sum':      return `2d${s}`
    default:              return `1d${s}`
  }
}

function rollStubComment(dice0) {
  if (!dice0) return '// TODO: implement your system\'s dice mechanic'
  switch (dice0.mechanic) {
    case 'roll-under':    return `// Roll under ${dice0.targetFormula || '@attr'} to succeed`
    case 'roll-over':     return `// Roll equal to or above ${dice0.targetFormula || '@attr'} to succeed`
    case 'roll-plus-mod': return `// Roll 1d${dice0.sides || 20} + ${dice0.modFormula || '@attr'} vs difficulty`
    case 'pool-count':    return `// Roll a pool, count successes (threshold: ${dice0.threshold ?? 5})`
    case 'pool-sum':      return `// Roll a pool, sum results`
    default:              return '// TODO: implement your system\'s dice mechanic'
  }
}

// ── Field type → Foundry field expression ────────────────────────────────────

function fieldToFoundryExpr(field) {
  switch (field.type) {
    case 'text':
      return `new f.StringField({ initial: '' })`
    case 'number': {
      const parts = ['initial: 0']
      if (field.min != null) parts.push(`min: ${field.min}`)
      if (field.max != null) parts.push(`max: ${field.max}`)
      return `new f.NumberField({ ${parts.join(', ')} })`
    }
    case 'boolean':
      return `new f.BooleanField({ initial: false })`
    case 'select': {
      const choices = (field.options || []).map(o => `'${o.value}': '${o.label || o.value}'`).join(', ')
      const initial = field.options?.[0]?.value ?? ''
      return `new f.StringField({ initial: '${initial}', choices: { ${choices} } })`
    }
    case 'tags':
      return `new f.ArrayField(new f.StringField())`
    case 'textarea':
      return `new f.HTMLField({ initial: '' })`
    default:
      return null
  }
}

// ── TypeDataModels (always overwritten — purely schema-derived) ───────────────

export function buildTypeDataTs(ct) {
  const cls = toPascalCase(ct.label || ct.id)
  const fieldLines = (ct.fields || [])
    .map(f => { const expr = fieldToFoundryExpr(f); return expr ? `      ${f.id}: ${expr},` : null })
    .filter(Boolean).join('\n')

  return `// AUTO-GENERATED — regenerated on every export
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const foundry: any;

export class ${cls}Data extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = foundry.data.fields;
    return {
${fieldLines || '      // No fields defined yet'}
    };
  }
}
`
}

export function buildCharacterDataTs(world) {
  const cls      = toPascalCase(world.meta.systemId)
  const attrs    = (world.attributes || []).filter(a => a.type !== 'derived')
  const skills   = world.skills || []
  const resources = world.resources || []

  const attrLines = attrs.map(a =>
    `      ${a.id}: new f.NumberField({ initial: ${a.default ?? a.min ?? 0}, integer: true, min: ${a.min ?? 0}, max: ${a.max ?? 10} }),`
  ).join('\n')

  const skillLines = skills.map(s =>
    `        ${s.id}: new f.NumberField({ initial: 0, integer: true, min: 0 }),`
  ).join('\n')

  const resourceLines = resources.flatMap(r => [
    `      ${r.id}: new f.NumberField({ initial: 0, integer: true, min: 0 }),`,
    `      ${r.id}Max: new f.NumberField({ initial: 10, integer: true, min: 0 }),`
  ]).join('\n')

  const skillsField = skills.length
    ? `\n      skills: new f.SchemaField({\n${skillLines}\n      }),`
    : ''

  return `// AUTO-GENERATED — regenerated on every export
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const foundry: any;

export class ${cls}CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = foundry.data.fields;
    return {
${attrLines}${skillsField}
${resourceLines}
      notes: new f.HTMLField({ initial: '' }),
    };
  }
}
`
}

// ── Character sheet base (always overwritten) ─────────────────────────────────

export function buildCharacterSheetBaseTs(world) {
  const id       = world.meta.systemId
  const cls      = toPascalCase(id)
  const attrs    = (world.attributes || []).filter(a => a.type !== 'derived')
  const skills   = world.skills || []
  const resources = world.resources || []

  const attrConst = attrs.map(a => `  { key: '${a.id}', label: '${a.label}' },`).join('\n')
  const skillConst = skills.map(s => `  { key: '${s.id}', label: '${s.label}' },`).join('\n')
  const resConst  = resources.map(r => `  { key: '${r.id}', label: '${r.label}' },`).join('\n')

  const partials = [
    ...(attrs.length    ? [`  'systems/${id}/templates/generated/character-attrs.hbs',`]    : []),
    ...(skills.length   ? [`  'systems/${id}/templates/generated/character-skills.hbs',`]   : []),
    ...(resources.length ? [`  'systems/${id}/templates/generated/character-resources.hbs',`] : []),
  ].join('\n')

  const attrsCtx    = attrs.length    ? `    const attrs        = ATTRS.map(({ key, label }) => ({ key, label, value: sys[key] ?? 0 }));` : ''
  const skillsCtx   = skills.length   ? `    const skillRows    = SKILLS.map(({ key, label }) => ({ key, label, rank: sys.skills?.[key] ?? 0 }));` : ''
  const resourcesCtx = resources.length ? `    const resourceRows = RESOURCES.map(({ key, label }) => ({ key, label, current: sys[key] ?? 0, max: sys[key + 'Max'] ?? 10 }));` : ''

  const ctxReturn = [
    '      actor,', '      name: actor.name,',
    attrs.length     ? '      attrs,'        : '',
    skills.length    ? '      skillRows,'    : '',
    resources.length ? '      resourceRows,' : '',
    '      notes: sys.notes,',
  ].filter(Boolean).join('\n')

  return `// AUTO-GENERATED — regenerated on every export. Do not edit.
// Extend this class in ../actors/${cls}CharacterSheet.ts instead.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const foundry: any;

export const ATTRS = [
${attrConst}
];

export const SKILLS = [
${skillConst}
];

export const RESOURCES = [
${resConst}
];

export const GENERATED_PARTIALS = [
${partials}
];

export abstract class ${cls}CharacterSheetBase extends (foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.DocumentSheetV2,
)) {
  static DEFAULT_OPTIONS = {
    classes: ['dtk-app', '${id}-sheet'],
    window: { resizable: true },
    position: { width: 740, height: 600 },
  };

  static PARTS = {
    sheet: { template: 'systems/${id}/templates/character-sheet.hbs' },
  };

  async _prepareContext(_options: any): Promise<any> {
    const actor = this.document as any;
    const sys   = actor.system;
${attrsCtx}
${skillsCtx}
${resourcesCtx}
    return {
${ctxReturn}
    };
  }
}
`
}

// ── Character sheet extension stub (written once — developer owns) ────────────

export function buildCharacterSheetExtTs(world) {
  const id    = world.meta.systemId
  const cls   = toPascalCase(id)
  const dice0 = (world.dice || [])[0]
  const sides = dice0?.sides || 20
  const comment = rollStubComment(dice0)

  const attrRollExpr = dice0?.mechanic === 'roll-plus-mod'
    ? `\`1d${sides} + \${value}\``
    : `\`1d${sides}\``

  const skillRollExpr = dice0?.mechanic === 'roll-plus-mod'
    ? `\`1d${sides} + \${rank}\``
    : `\`1d${sides}\``

  return `// Safe to edit — this file is never overwritten by the editor.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const Roll: any;
declare const ChatMessage: any;

import { ${cls}CharacterSheetBase } from '../generated/${cls}CharacterSheetBase.js';

export class ${cls}CharacterSheet extends ${cls}CharacterSheetBase {
  static DEFAULT_OPTIONS = {
    ...${cls}CharacterSheetBase.DEFAULT_OPTIONS,
    actions: {
      rollAttr:  ${cls}CharacterSheet._onRollAttr,
      rollSkill: ${cls}CharacterSheet._onRollSkill,
    },
  };

  static async _onRollAttr(this: ${cls}CharacterSheet, _e: Event, t: HTMLElement): Promise<void> {
    const key   = t.dataset.attr!;
    const value = (this.document as any).system[key] ?? 1;
    ${comment}
    const roll  = new Roll(${attrRollExpr});
    await roll.evaluate();
    await ChatMessage.create({
      content: \`<b>\${key}</b> (\${value}) → \${roll.total}\`,
      speaker: ChatMessage.getSpeaker({ actor: this.document as any }),
      rolls: [roll],
    });
  }

  static async _onRollSkill(this: ${cls}CharacterSheet, _e: Event, t: HTMLElement): Promise<void> {
    const key  = t.dataset.skill!;
    const rank = (this.document as any).system.skills?.[key] ?? 0;
    ${comment}
    const roll = new Roll(${skillRollExpr});
    await roll.evaluate();
    await ChatMessage.create({
      content: \`<b>\${key}</b> (rank \${rank}) → \${roll.total}\`,
      speaker: ChatMessage.getSpeaker({ actor: this.document as any }),
      rolls: [roll],
    });
  }
}
`
}

// ── Actor content type sheet base (always overwritten) ────────────────────────

export function buildTypeSheetBaseTs(world, ct) {
  const id  = world.meta.systemId
  const cls = toPascalCase(ct.label || ct.id)

  const fieldRows = (ct.fields || []).filter(f => fieldToFoundryExpr(f))
    .map(f => `  { key: '${f.id}', label: '${f.label}' },`).join('\n')

  return `// AUTO-GENERATED — regenerated on every export. Do not edit.
// Extend this class in ../types/${cls}Sheet.ts instead.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const foundry: any;

export const ${cls.toUpperCase()}_FIELDS = [
${fieldRows}
];

export abstract class ${cls}SheetBase extends (foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.DocumentSheetV2,
)) {
  static DEFAULT_OPTIONS = {
    classes: ['dtk-app', '${id}-${ct.id}-sheet'],
    window: { resizable: true },
    position: { width: 600, height: 480 },
  };

  static PARTS = {
    sheet: { template: 'systems/${id}/templates/${ct.id}-sheet.hbs' },
  };

  async _prepareContext(_options: any): Promise<any> {
    const doc = this.document as any;
    return {
      doc,
      name: doc.name,
      fieldRows: ${cls.toUpperCase()}_FIELDS.map(({ key, label }) => ({
        key, label, value: doc.system[key],
      })),
    };
  }
}
`
}

// ── Actor type sheet extension stub (written once) ────────────────────────────

export function buildTypeSheetExtTs(world, ct) {
  const cls = toPascalCase(ct.label || ct.id)

  return `// Safe to edit — this file is never overwritten by the editor.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ${cls}SheetBase } from '../generated/${cls}SheetBase.js';

export class ${cls}Sheet extends ${cls}SheetBase {
  // Add actions, custom context, or override _prepareContext here.
}
`
}

export function buildItemSheetBaseTs(world, ct) {
  const id  = world.meta.systemId
  const cls = toPascalCase(ct.label || ct.id)
  const fieldRows = (ct.fields || []).filter(f => fieldToFoundryExpr(f))
    .map(f => `  { key: '${f.id}', label: '${f.label}' },`).join('\n')
  return `// AUTO-GENERATED — regenerated on every export. Do not edit.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const foundry: any;

export const ${cls.toUpperCase()}_ITEM_FIELDS = [
${fieldRows}
];

export abstract class ${cls}ItemSheetBase extends (foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.DocumentSheetV2,
)) {
  static DEFAULT_OPTIONS = {
    classes: ['dtk-app', '${id}-${ct.id}-sheet'],
    window: { resizable: true },
    position: { width: 560, height: 440 },
  };

  static PARTS = {
    sheet: { template: 'systems/${id}/templates/${ct.id}-sheet.hbs' },
  };

  async _prepareContext(_options: any): Promise<any> {
    const doc = this.document as any;
    return {
      doc,
      name: doc.name,
      fieldRows: ${cls.toUpperCase()}_ITEM_FIELDS.map(({ key, label }) => ({
        key, label, value: doc.system[key],
      })),
    };
  }
}
`
}

export function buildItemSheetExtTs(world, ct) {
  const cls = toPascalCase(ct.label || ct.id)
  return `// Safe to edit — this file is never overwritten by the editor.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ${cls}ItemSheetBase } from '../generated/${cls}ItemSheetBase.js';

export class ${cls}ItemSheet extends ${cls}ItemSheetBase {
  // Add custom actions or context overrides here.
}
`
}

// ── Generated HBS partials (always overwritten) ───────────────────────────────

export function buildAttrsHbs(world) {
  const id = world.meta.systemId
  return `{{!-- AUTO-GENERATED — regenerated on every export --}}
<section class="${id}-section">
  <h3>Attributes</h3>
  <div class="${id}-attrs">
    {{#each attrs as |attr|}}
    <div class="${id}-attr">
      <button data-action="rollAttr" data-attr="{{attr.key}}" title="Roll {{attr.label}}">
        <span class="${id}-attr__label">{{attr.label}}</span>
        <span class="${id}-attr__value">{{attr.value}}</span>
      </button>
      <input type="number" name="system.{{attr.key}}" value="{{attr.value}}" min="0">
    </div>
    {{/each}}
  </div>
</section>
`
}

export function buildSkillsHbs(world) {
  const id = world.meta.systemId
  return `{{!-- AUTO-GENERATED — regenerated on every export --}}
<section class="${id}-section">
  <h3>Skills</h3>
  <div class="${id}-skills">
    {{#each skillRows as |skill|}}
    <div class="${id}-skill">
      <button data-action="rollSkill" data-skill="{{skill.key}}">{{skill.label}}</button>
      <input type="number" name="system.skills.{{skill.key}}" value="{{skill.rank}}" min="0">
    </div>
    {{/each}}
  </div>
</section>
`
}

export function buildResourcesHbs(world) {
  const id = world.meta.systemId
  return `{{!-- AUTO-GENERATED — regenerated on every export --}}
<section class="${id}-section">
  <h3>Resources</h3>
  {{#each resourceRows as |res|}}
  <div class="${id}-resource">
    <span class="${id}-resource__label">{{res.label}}</span>
    <input type="number" name="system.{{res.key}}" value="{{res.current}}" min="0">
    <span>/</span>
    <input type="number" name="system.{{res.key}}Max" value="{{res.max}}" min="0">
  </div>
  {{/each}}
</section>
`
}

export function buildTypeFieldsHbs(world, ct) {
  const id = world.meta.systemId
  return `{{!-- AUTO-GENERATED — regenerated on every export --}}
<div class="${id}-${ct.id}-fields">
  {{#each fieldRows as |row|}}
  <div class="${id}-field-row">
    <label>{{row.label}}</label>
    <input type="text" name="system.{{row.key}}" value="{{row.value}}">
  </div>
  {{/each}}
</div>
`
}

// ── Layout HBS templates (written once — developer owns) ──────────────────────

export function buildCharacterSheetLayoutHbs(world) {
  const id = world.meta.systemId
  const attrs    = (world.attributes || []).filter(a => a.type !== 'derived')
  const skills   = world.skills || []
  const resources = world.resources || []

  const includes = [
    attrs.length     ? `    {{> "systems/${id}/templates/generated/character-attrs.hbs"}}` : '',
    skills.length    ? `    {{> "systems/${id}/templates/generated/character-skills.hbs"}}` : '',
    resources.length ? `    {{> "systems/${id}/templates/generated/character-resources.hbs"}}` : '',
  ].filter(Boolean).join('\n')

  return `{{!-- Safe to edit — this file is never overwritten by the editor. --}}
<div class="${id}-sheet">
  <header class="${id}-sheet__header">
    <input type="text" name="name" value="{{name}}" placeholder="Character Name">
  </header>
  <div class="${id}-sheet__body">
${includes}
    {{!-- Add custom columns or sections here --}}
  </div>
  <div class="${id}-sheet__notes">
    <textarea name="system.notes" rows="4" placeholder="Notes…">{{notes}}</textarea>
  </div>
</div>
`
}

export function buildTypeSheetLayoutHbs(world, ct) {
  const id = world.meta.systemId
  return `{{!-- Safe to edit — this file is never overwritten by the editor. --}}
<div class="${id}-${ct.id}-sheet">
  <header>
    <input type="text" name="name" value="{{name}}" placeholder="${ct.label || ct.id} Name">
  </header>
  {{> "systems/${id}/templates/generated/${ct.id}-fields.hbs"}}
  {{!-- Add custom sections here --}}
</div>
`
}

// ── src/generated/register.ts (always overwritten) ───────────────────────────

export function buildRegisterTs(world) {
  const id    = world.meta.systemId
  const cls   = toPascalCase(id)
  const types = world.contentTypes || []

  const actorCts  = types.filter(ct => ct.documentType === 'Actor')
  const itemCts   = types.filter(ct => (ct.documentType || 'Item') === 'Item')
  const effectCts = types.filter(ct => ct.documentType === 'ActiveEffect')

  const imports = [
    `import { ${cls}CharacterData } from '../actors/${cls}CharacterData.js';`,
    `import { ${cls}CharacterSheet } from '../actors/${cls}CharacterSheet.js';`,
    ...actorCts.map(ct => {
      const c = toPascalCase(ct.label || ct.id)
      return `import { ${c}Data } from '../types/${c}Data.js';\nimport { ${c}Sheet } from '../types/${c}Sheet.js';`
    }),
    ...itemCts.flatMap(ct => {
      const c = toPascalCase(ct.label || ct.id)
      return [
        `import { ${c}Data } from '../types/${c}Data.js';`,
        `import { ${c}ItemSheet } from '../types/${c}ItemSheet.js';`,
      ]
    }),
    ...effectCts.map(ct => `import { ${toPascalCase(ct.label || ct.id)}Data } from '../types/${toPascalCase(ct.label || ct.id)}Data.js';`),
  ].join('\n')

  const attrs    = (world.attributes || []).filter(a => a.type !== 'derived')
  const skills   = world.skills || []
  const resources = world.resources || []
  const partialPaths = [
    ...(attrs.length     ? [`  'systems/${id}/templates/generated/character-attrs.hbs',`]     : []),
    ...(skills.length    ? [`  'systems/${id}/templates/generated/character-skills.hbs',`]    : []),
    ...(resources.length ? [`  'systems/${id}/templates/generated/character-resources.hbs',`] : []),
    ...actorCts.map(ct => `  'systems/${id}/templates/generated/${ct.id}-fields.hbs',`),
    ...itemCts.map(ct =>  `  'systems/${id}/templates/generated/${ct.id}-fields.hbs',`),
  ].join('\n')

  const registrations = [
    `  CONFIG.Actor.dataModels['character'] = ${cls}CharacterData;`,
    `  Actors.registerSheet('${id}', ${cls}CharacterSheet, {`,
    `    types: ['character'], makeDefault: true, label: '${world.meta.name || id} Character',`,
    `  });`,
    ...actorCts.flatMap(ct => {
      const c = toPascalCase(ct.label || ct.id)
      return [
        `  CONFIG.Actor.dataModels['${ct.id}'] = ${c}Data;`,
        `  Actors.registerSheet('${id}', ${c}Sheet, {`,
        `    types: ['${ct.id}'], makeDefault: true, label: '${ct.label || ct.id}',`,
        `  });`,
      ]
    }),
    ...itemCts.flatMap(ct => {
      const c = toPascalCase(ct.label || ct.id)
      return [
        `  CONFIG.Item.dataModels['${ct.id}'] = ${c}Data;`,
        `  Items.registerSheet('${id}', ${c}ItemSheet, {`,
        `    types: ['${ct.id}'], makeDefault: true, label: '${ct.label || ct.id}',`,
        `  });`,
      ]
    }),
    ...effectCts.map(ct => `  CONFIG.ActiveEffect.dataModels['${ct.id}'] = ${toPascalCase(ct.label || ct.id)}Data;`),
  ].join('\n')

  return `// AUTO-GENERATED — regenerated on every export. Do not edit.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const foundry: any;
declare const CONFIG: any;
declare const Actors: any;
declare const Items: any;

${imports}

export async function registerTypes(): Promise<void> {
  await foundry.applications.handlebars.loadTemplates([
${partialPaths}
  ]);

${registrations}
}
`
}

// ── src/index.ts entry point (written once — developer owns) ──────────────────

export function buildIndexTs(world) {
  const id = world.meta.systemId
  return `// Safe to edit — this file is never overwritten by the editor.
import '../styles/index.css';
import { registerTypes } from './generated/register.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const Hooks: any;

Hooks.on('init', async () => {
  await registerTypes();
  // Add custom initialization below
});
`
}

// ── lang/en.json ──────────────────────────────────────────────────────────────

export function buildLangJson(world) {
  const prefix = world.meta.systemId.toUpperCase().replace(/-/g, '_')
  const types  = world.contentTypes || []

  const actorCts  = types.filter(ct => ct.documentType === 'Actor')
  const itemCts   = types.filter(ct => (ct.documentType || 'Item') === 'Item')
  const effectCts = types.filter(ct => ct.documentType === 'ActiveEffect')

  const attrs     = world.attributes || []
  const skills    = world.skills || []
  const resources = world.resources || []
  const currencies = world.currencies || []

  const obj = {}

  // Character type (always present)
  obj[`${prefix}.Actor.character`] = 'Character'

  // Actor content types
  for (const ct of actorCts) {
    obj[`${prefix}.Actor.${ct.id}`] = ct.label || ct.id
  }

  // Item content types
  for (const ct of itemCts) {
    obj[`${prefix}.Item.${ct.id}`] = ct.label || ct.id
  }

  // ActiveEffect content types
  for (const ct of effectCts) {
    obj[`${prefix}.Effect.${ct.id}`] = ct.label || ct.id
  }

  // Attributes
  for (const a of attrs) {
    obj[`${prefix}.Attribute.${a.id}`] = a.label
  }

  // Skills
  for (const s of skills) {
    obj[`${prefix}.Skill.${s.id}`] = s.label
  }

  // Resources
  for (const r of resources) {
    obj[`${prefix}.Resource.${r.id}`] = r.label
  }

  // Currencies
  for (const c of currencies) {
    obj[`${prefix}.Currency.${c.id}`] = c.label || c.id
  }

  // Sheet tabs (always included)
  obj[`${prefix}.SheetTab.attributes`] = 'Attributes'
  obj[`${prefix}.SheetTab.skills`]     = 'Skills'
  obj[`${prefix}.SheetTab.resources`]  = 'Resources'

  return JSON.stringify(obj, null, 2)
}

// ── system.json ───────────────────────────────────────────────────────────────

export function buildSystemJson(world) {
  const id    = world.meta.systemId
  const types = world.contentTypes || []

  const actorTypes  = { character: {} }
  const itemTypes   = {}
  const effectTypes = {}
  const packs       = []

  for (const ct of types) {
    const dt = ct.documentType || 'Item'
    if (dt === 'Actor')             actorTypes[ct.id]  = {}
    else if (dt === 'ActiveEffect') effectTypes[ct.id] = {}
    else                            itemTypes[ct.id]   = {}

    if (dt !== 'ActiveEffect') {
      packs.push({ name: ct.id, label: ct.label || ct.id, path: `packs/${ct.id}`, type: dt === 'Actor' ? 'Actor' : 'Item', flags: {} })
    }
  }

  const dice0 = (world.dice || [])[0]
  const initiative = dice0 ? initiativeFormula(dice0) : '1d20'

  const documentTypes = { Actor: actorTypes }
  if (Object.keys(itemTypes).length)   documentTypes.Item         = itemTypes
  if (Object.keys(effectTypes).length) documentTypes.ActiveEffect = effectTypes

  return {
    id, title: world.meta.name || id, description: world.meta.description || '',
    version: world.meta.version || '0.1.0',
    compatibility: world.plugin?.compatibility ?? { minimum: '12', verified: '14' },
    relationships: {
      requires: [{ id: 'dtk', type: 'module' }, { id: 'dtk-fascia', type: 'module' }],
      optional: [{ id: 'dtk-alea', type: 'module', reason: 'Enables sequence-driven roll execution.' }]
    },
    initiative,
    languages: [{ lang: 'en', name: 'English', path: 'lang/en.json' }],
    documentTypes,
    esmodules: [`dist/${id}.js`], styles: [`dist/style.css`],
    packs, flags: {}
  }
}

// ── Build tooling ─────────────────────────────────────────────────────────────

export function buildPackageJson(world) {
  return JSON.stringify({
    name: world.meta.systemId, version: world.meta.version || '0.1.0',
    type: 'module', private: true,
    scripts: { build: 'vite build', watch: 'vite build --watch', typecheck: 'tsc --noEmit', 'build:packs': 'node scripts/build-packs.mjs' },
    devDependencies: { 'classic-level': '^1.4.0', 'js-yaml': '^4.1.0', typescript: '^5.4.0', vite: '^5.0.0' },
    allowScripts: { 'classic-level@1.4.1': true }
  }, null, 2)
}

export function buildViteConfig(world) {
  const id = world.meta.systemId
  return `import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: { entry: resolve(__dirname, 'src/index.ts'), formats: ['es'], fileName: () => '${id}.js' },
    outDir: 'dist', sourcemap: true, minify: false, cssCodeSplit: false,
  },
})
`
}

export function buildTsConfig() {
  return JSON.stringify({
    compilerOptions: { target: 'ESNext', module: 'ESNext', moduleResolution: 'bundler', strict: true, skipLibCheck: true, lib: ['ESNext', 'DOM'] },
    include: ['src/**/*.ts'], exclude: ['dist', 'node_modules']
  }, null, 2)
}

export function buildGitignore() {
  return `node_modules/\n*.zip\n`
}

export function buildIndexCss(world) {
  const id = world.meta.systemId
  return `/* Safe to edit — this file is never overwritten by the editor. */
.${id}-sheet { display: flex; flex-direction: column; gap: 12px; padding: 16px; font-family: var(--font-primary, system-ui, sans-serif); }
.${id}-sheet__header input[name="name"] { font-size: 1.2rem; font-weight: 700; width: 100%; border: none; border-bottom: 2px solid var(--color-border-light, #ccc); background: transparent; padding: 4px 0; }
.${id}-sheet__body { display: flex; flex-wrap: wrap; gap: 16px; }
.${id}-section { flex: 1; min-width: 180px; }
.${id}-section h3 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: #666; margin: 0 0 8px; }
.${id}-attrs, .${id}-skills { display: flex; flex-direction: column; gap: 4px; }
.${id}-attr, .${id}-skill, .${id}-resource { display: flex; align-items: center; gap: 6px; }
.${id}-attr button, .${id}-skill button { flex: 1; text-align: left; cursor: pointer; background: transparent; border: 1px solid #ccc; border-radius: 3px; padding: 2px 8px; }
.${id}-attr button:hover, .${id}-skill button:hover { background: rgba(0,0,0,0.05); }
.${id}-attr input, .${id}-skill input, .${id}-resource input { width: 48px; text-align: center; }
.${id}-resource__label { flex: 1; }
.${id}-sheet__notes textarea { width: 100%; resize: vertical; }
.${id}-field-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.${id}-field-row label { flex: 0 0 140px; font-weight: 600; }
`
}

// ── GitHub Actions + scripts ──────────────────────────────────────────────────

export function buildCiYml() {
  return `name: CI
on:
  push:
    branches: ['**']
    tags-ignore: ['v*']
  pull_request:
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run typecheck
`
}

export function buildReleaseYml(world) {
  const id = world.meta.systemId
  return `name: Release
on:
  push:
    tags: ['v*.*.*']
jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - name: Update manifest URLs
        env:
          REPO: \${{ github.repository }}
          TAG:  \${{ github.ref_name }}
        run: |
          node -e "
            const fs = require('fs');
            const m  = JSON.parse(fs.readFileSync('system.json', 'utf8'));
            m.version  = process.env.TAG.replace(/^v/, '');
            m.download = \\\`https://github.com/\\\${process.env.REPO}/releases/download/\\\${process.env.TAG}/${id}.zip\\\`;
            m.manifest = \\\`https://github.com/\\\${process.env.REPO}/releases/latest/download/system.json\\\`;
            fs.writeFileSync('system.json', JSON.stringify(m, null, 2));
          "
      - name: Create zip
        run: zip -r ${id}.zip system.json dist/ packs/ templates/ styles/
      - uses: softprops/action-gh-release@v2
        with:
          files: |
            ${id}.zip
            system.json
          generate_release_notes: true
`
}

export function buildBuildPacksMjs(world) {
  return `#!/usr/bin/env node
import { readFile, readdir, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import yaml from 'js-yaml'
import { ClassicLevel } from 'classic-level'

const config     = yaml.load(await readFile('promptuarium.config.yaml', 'utf8'))
const exemplarDir = config.exemplarsDir ?? './exemplars'
const packs      = config.packs ?? []

const files    = (await readdir(exemplarDir)).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
const exemplars = await Promise.all(files.map(async f =>
  yaml.load(await readFile(join(exemplarDir, f), 'utf8'))
))

for (const pack of packs) {
  const entries = exemplars.filter(e => e.kind === pack.kind)
  if (!entries.length) continue

  await mkdir(pack.outputDir, { recursive: true })
  const db = new ClassicLevel(pack.outputDir, { keyEncoding: 'utf8', valueEncoding: 'json' })

  for (const entry of entries) {
    const base = ['id','version','kind','name','description','tags']
    const doc  = {
      _id:    entry.id,
      name:   entry.name ?? entry.id,
      type:   pack.kind,
      system: Object.fromEntries(Object.entries(entry).filter(([k]) => !base.includes(k))),
      flags:  {},
    }
    if (entry.description) doc.system.description = entry.description
    await db.put(\`!\${(pack.type ?? 'item').toLowerCase()}s!\${entry.id}\`, doc)
  }

  await db.close()
  console.log(\`packed \${entries.length} → \${pack.outputDir}\`)
}
`
}

// ── All scaffold files ────────────────────────────────────────────────────────

export function scaffoldFiles(world) {
  const id    = world.meta.systemId
  const cls   = toPascalCase(id)
  const types = world.contentTypes || []

  const attrs    = (world.attributes || []).filter(a => a.type !== 'derived')
  const skills   = world.skills || []
  const resources = world.resources || []
  const actorCts  = types.filter(ct => ct.documentType === 'Actor')

  // Files the editor always owns — safe to overwrite every export
  const generated = [
    { path: 'system.json',                                   content: JSON.stringify(buildSystemJson(world), null, 2) },
    { path: 'lang/en.json',                                  content: buildLangJson(world) },
    { path: 'package.json',                                  content: buildPackageJson(world) },
    { path: 'tsconfig.json',                                 content: buildTsConfig() },
    { path: 'vite.config.ts',                                content: buildViteConfig(world) },
    { path: '.gitignore',                                    content: buildGitignore() },
    { path: '.github/workflows/ci.yml',                      content: buildCiYml() },
    { path: '.github/workflows/release.yml',                 content: buildReleaseYml(world) },
    { path: 'scripts/build-packs.mjs',                       content: buildBuildPacksMjs(world) },
    { path: `src/actors/${cls}CharacterData.ts`,             content: buildCharacterDataTs(world) },
    { path: `src/generated/${cls}CharacterSheetBase.ts`,     content: buildCharacterSheetBaseTs(world) },
    { path: `src/generated/register.ts`,                     content: buildRegisterTs(world) },
    ...(attrs.length    ? [{ path: 'templates/generated/character-attrs.hbs',     content: buildAttrsHbs(world) }] : []),
    ...(skills.length   ? [{ path: 'templates/generated/character-skills.hbs',    content: buildSkillsHbs(world) }] : []),
    ...(resources.length ? [{ path: 'templates/generated/character-resources.hbs', content: buildResourcesHbs(world) }] : []),
    ...types.map(ct => ({ path: `src/types/${toPascalCase(ct.label || ct.id)}Data.ts`, content: buildTypeDataTs(ct) })),
    ...actorCts.map(ct => ({ path: `src/generated/${toPascalCase(ct.label || ct.id)}SheetBase.ts`, content: buildTypeSheetBaseTs(world, ct) })),
    ...itemCts.map(ct => ({ path: `src/generated/${toPascalCase(ct.label || ct.id)}ItemSheetBase.ts`, content: buildItemSheetBaseTs(world, ct) })),
    ...types.map(ct => ({ path: `templates/generated/${ct.id}-fields.hbs`, content: buildTypeFieldsHbs(world, ct) })),
  ]

  // Files the developer owns — written once on first export, never overwritten
  const once = [
    { path: 'src/index.ts',                                  content: buildIndexTs(world) },
    { path: `src/actors/${cls}CharacterSheet.ts`,            content: buildCharacterSheetExtTs(world) },
    { path: 'styles/index.css',                              content: buildIndexCss(world) },
    { path: 'templates/character-sheet.hbs',                 content: buildCharacterSheetLayoutHbs(world) },
    ...actorCts.map(ct => ({ path: `src/types/${toPascalCase(ct.label || ct.id)}Sheet.ts`, content: buildTypeSheetExtTs(world, ct) })),
    ...actorCts.map(ct => ({ path: `templates/${ct.id}-sheet.hbs`, content: buildTypeSheetLayoutHbs(world, ct) })),
    ...itemCts.map(ct => ({ path: `src/types/${toPascalCase(ct.label || ct.id)}ItemSheet.ts`, content: buildItemSheetExtTs(world, ct) })),
    ...itemCts.map(ct => ({ path: `templates/${ct.id}-sheet.hbs`, content: buildTypeSheetLayoutHbs(world, ct) })),
  ]

  return [
    ...generated.map(f => ({ ...f, once: false })),
    ...once.map(f => ({      ...f, once: true  })),
  ]
}
