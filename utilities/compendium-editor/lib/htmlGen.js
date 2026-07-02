const EMBEDDED_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;font-size:15px;color:#1a1a2e;background:#fff}
nav.toc{position:fixed;top:0;left:0;width:200px;height:100vh;background:#1a1a2e;color:#fff;padding:20px 0;overflow-y:auto}
nav.toc h1{font-size:14px;font-weight:700;padding:0 16px 16px;border-bottom:1px solid rgba(255,255,255,.15);margin-bottom:8px}
nav.toc a{display:block;padding:6px 16px;color:rgba(255,255,255,.75);text-decoration:none;font-size:13px}
nav.toc a:hover{color:#fff;background:rgba(108,99,255,.4)}
main{margin-left:220px;padding:32px 48px;max-width:1100px}
section{margin-bottom:48px;padding-bottom:32px;border-bottom:1px solid #e0e0f0}
section:last-child{border-bottom:none}
h1{font-size:2rem;font-weight:800;margin-bottom:8px}
h2{font-size:1.4rem;font-weight:700;margin-bottom:20px;padding-bottom:8px;border-bottom:2px solid #6c63ff;color:#1a1a2e}
h3{font-size:1.1rem;font-weight:600;margin:20px 0 6px}
h4{font-size:.9rem;font-weight:700;margin:16px 0 8px;text-transform:uppercase;letter-spacing:.05em;color:#666688}
p{line-height:1.65;margin-bottom:12px;color:#333355}
.version-badge{display:inline-block;background:#6c63ff;color:#fff;font-size:11px;padding:2px 8px;border-radius:12px;margin-bottom:16px}
table{border-collapse:collapse;width:100%;margin-bottom:16px;font-size:14px}
th{background:#f0f0f8;text-align:left;padding:8px 12px;font-weight:600;border:1px solid #e0e0f0}
td{padding:8px 12px;border:1px solid #e0e0f0;vertical-align:top}
.tag{display:inline-block;background:#6c63ff;color:#fff;font-size:11px;padding:1px 7px;border-radius:3px;margin:0 3px 4px 0}
article.entry{border-left:3px solid #6c63ff;padding:12px 16px;margin-bottom:20px;background:#f8f8fc;border-radius:0 6px 6px 0}
article.entry h3{margin-top:0}
dl.entry-data{margin:8px 0 0;font-size:14px}
dl.entry-data dt{font-weight:600;color:#444466;float:left;clear:left;width:140px}
dl.entry-data dd{margin-left:150px;margin-bottom:4px;color:#333355}
.step-card{border:1px solid #e0e0f0;border-radius:6px;padding:14px 16px;margin-bottom:16px}
.step-num{display:inline-block;background:#6c63ff;color:#fff;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;margin-right:8px}
@media print{nav.toc{display:none}main{margin-left:0}}
`

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const MECH_LABELS = { 'pool-count':'Pool Count','pool-sum':'Pool Sum','single-die':'Single Die','step-die':'Step Die','roll-under':'Roll Under','advantage-disadvantage':'Advantage/Disadvantage','target-number':'Target Number','drama-die':'Drama Die','custom':'Custom' }

function sectionOverview(world) {
  return `<section id="overview">
<h1>${esc(world.meta.name || 'Untitled System')}</h1>
<span class="version-badge">v${esc(world.meta.version || '0.1.0')}</span>
${world.meta.description ? `<p>${esc(world.meta.description)}</p>` : ''}
</section>`
}

function sectionDice(world) {
  const rows = world.dice.map(e =>
    `<tr><td>${esc(e.name || e.id)}</td><td>${esc(MECH_LABELS[e.mechanic] || e.mechanic)}</td><td>${e.sides ? `d${esc(e.sides)}` : '—'}</td><td>${e.threshold != null ? `${esc(e.threshold)}+` : '—'}</td></tr>`
  ).join('')
  const degreeSections = world.dice.filter(e => e.degrees?.length).map(e => {
    const dRows = e.degrees.map(d => `<tr><td>${esc(d.label)}</td><td>${esc(d.min)}</td></tr>`).join('')
    return `<h4>${esc(e.name || e.id)} — Degrees of Success</h4>
<table><tr><th>Degree</th><th>Minimum</th></tr>${dRows}</table>`
  }).join('')
  return `<section id="dice"><h2>Dice Mechanics</h2>
<table><tr><th>Name</th><th>Mechanic</th><th>Die</th><th>Threshold</th></tr>${rows}</table>
${degreeSections}</section>`
}

function sectionAttributes(attrs) {
  const rows = attrs.map(a => `<h3>${esc(a.label)} <small style="color:#888;font-weight:400">(${esc(a.id)})</small></h3>
${a.type !== 'derived' ? `<p style="font-size:13px;color:#666688">Range: ${esc(a.min ?? 1)}–${esc(a.max ?? 10)}${a.default != null ? ` (default: ${esc(a.default)})` : ''}</p>` : `<p style="font-size:13px;color:#666688">Derived: <code>${esc(a.formula)}</code></p>`}
${a.description ? `<p>${esc(a.description)}</p>` : ''}`).join('')
  return `<section id="attributes"><h2>Attributes</h2>${rows}</section>`
}

function sectionSkills(skills, attrs) {
  const attrMap = Object.fromEntries((attrs || []).map(a => [a.id, a.label]))
  const rows = skills.map(s => {
    const linked = (s.linkedAttributes || []).map(id => attrMap[id] || id).join(', ')
    return `<h3>${esc(s.label)} <small style="color:#888;font-weight:400">(${esc(s.id)})</small></h3>
${linked ? `<p style="font-size:13px;color:#666688">Linked to: ${esc(linked)}</p>` : ''}
${s.description ? `<p>${esc(s.description)}</p>` : ''}`
  }).join('')
  return `<section id="skills"><h2>Skills</h2>${rows}</section>`
}

function sectionDerived(derived) {
  const rows = derived.map(d => `<tr><td>${esc(d.label)}</td><td><code>${esc(d.formula)}</code></td><td>${esc(d.description || '')}</td></tr>`).join('')
  return `<section id="derived"><h2>Derived Statistics</h2>
<table><tr><th>Statistic</th><th>Formula</th><th>Description</th></tr>${rows}</table></section>`
}

function sectionResources(resources) {
  const rows = resources.map(r => `<tr><td>${esc(r.label)}</td><td><code>${esc(r.formula || '—')}</code></td><td>${r.recoverable !== false ? 'Yes' : 'No'}</td><td>${esc(r.description || '')}</td></tr>`).join('')
  return `<section id="resources"><h2>Resources</h2>
<table><tr><th>Resource</th><th>Max Formula</th><th>Recoverable</th><th>Description</th></tr>${rows}</table></section>`
}

function describeField(f) {
  switch (f.type) {
    case 'allocation': return `Distribute points (pool: <code>${esc(f.pool)}</code>) among: ${esc((f.targets || []).join(', '))}`
    case 'priority-matrix': return `Assign priorities [${esc((f.priorities || []).join(', '))}] to: ${esc((f.choices || []).join(', '))}`
    case 'select': return `Choose one: ${(f.options || []).map(o => esc(o.label || o.value)).join(', ')}`
    case 'exemplar-grid': return `Choose your ${esc(f.label)} from available ${esc(f.kind)} options`
    case 'number': return `Enter a number${f.min != null ? ` (${f.min}` : ''}${f.max != null ? `–${f.max})` : f.min != null ? '+)' : ''}`
    default: return `Enter ${esc(f.label)}`
  }
}

function sectionCreation(creation) {
  const steps = (creation.steps || []).map((step, i) => {
    const fields = (step.fields || []).map(f => `<li>${esc(f.label)}: ${describeField(f)}</li>`).join('')
    return `<div class="step-card">
<p><span class="step-num">${i + 1}</span><strong>${esc(step.label)}</strong></p>
${step.hint ? `<p style="margin:8px 0 0 32px;color:#555">${esc(step.hint)}</p>` : ''}
${fields ? `<ul style="margin:10px 0 0 32px">${fields}</ul>` : ''}
</div>`
  }).join('')
  return `<section id="creation"><h2>Character Creation</h2>${steps}</section>`
}

function sectionAdvancement(creation) {
  const tracks = (creation.advancementTracks || []).map(track => {
    const xp = (track.xpTable || []).map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x)}</td></tr>`).join('')
    const advs = (track.advancements || []).map(a => `<tr><td>${esc(a.label)}</td><td>${esc(a.cost)}</td><td>${esc(a.prerequisite || '—')}</td></tr>`).join('')
    return `<h3>${esc(track.label)}</h3>
${xp ? `<table style="width:auto;margin-bottom:12px"><tr><th>Level</th><th>XP Required</th></tr>${xp}</table>` : ''}
${advs ? `<table><tr><th>Advancement</th><th>Cost</th><th>Prerequisite</th></tr>${advs}</table>` : ''}`
  }).join('')
  return `<section id="advancement"><h2>Advancement</h2>${tracks}</section>`
}

function sectionContent(contentTypes, entries) {
  const byType = {}
  for (const e of entries) {
    if (!byType[e.kind]) byType[e.kind] = []
    byType[e.kind].push(e)
  }
  const typeOrder = contentTypes.map(ct => ct.id)
  const unknownTypes = Object.keys(byType).filter(t => !typeOrder.includes(t))
  const sections = []
  for (const typeId of [...typeOrder, ...unknownTypes]) {
    const group = byType[typeId]
    if (!group?.length) continue
    const ct = contentTypes.find(t => t.id === typeId)
    const label = ct?.label || (typeId.charAt(0).toUpperCase() + typeId.slice(1))
    const cards = group.map(e => {
      const tags = (e.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')
      const dataEntries = Object.entries(e.data || {}).filter(([, v]) => v != null && v !== '')
      const dl = dataEntries.length
        ? `<dl class="entry-data">${dataEntries.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(Array.isArray(v) ? v.join(', ') : v)}</dd>`).join('')}</dl>`
        : ''
      return `<article class="entry">
<h3>${esc(e.name)}${tags ? `<span style="margin-left:8px">${tags}</span>` : ''}</h3>
${e.description ? `<p>${esc(e.description)}</p>` : ''}
${dl}
</article>`
    }).join('')
    sections.push(`<section id="type-${esc(typeId)}"><h2>${esc(label)}</h2>${cards}</section>`)
  }
  return sections.join('\n')
}

export function generateCompendiumHTML(world) {
  const sections = []
  const tocLinks = []

  sections.push(sectionOverview(world))
  tocLinks.push(`<a href="#overview">Overview</a>`)

  if (world.dice?.length) {
    sections.push(sectionDice(world))
    tocLinks.push(`<a href="#dice">Dice Mechanics</a>`)
  }

  const attrs = world.attributes || []
  if (attrs.length) {
    sections.push(sectionAttributes(attrs))
    tocLinks.push(`<a href="#attributes">Attributes</a>`)
  }

  const skills = world.skills || []
  if (skills.length) {
    sections.push(sectionSkills(skills, attrs))
    tocLinks.push(`<a href="#skills">Skills</a>`)
  }

  const derived = world.derived || []
  if (derived.length) {
    sections.push(sectionDerived(derived))
    tocLinks.push(`<a href="#derived">Derived</a>`)
  }

  if (world.resources?.length) {
    sections.push(sectionResources(world.resources))
    tocLinks.push(`<a href="#resources">Resources</a>`)
  }

  if (world.creation?.steps?.length) {
    sections.push(sectionCreation(world.creation))
    tocLinks.push(`<a href="#creation">Character Creation</a>`)
  }

  if (world.creation?.advancementTracks?.length) {
    sections.push(sectionAdvancement(world.creation))
    tocLinks.push(`<a href="#advancement">Advancement</a>`)
  }

  if (world.content?.length) {
    const contentHtml = sectionContent(world.contentTypes || [], world.content)
    if (contentHtml) {
      sections.push(contentHtml)
      ;(world.contentTypes || []).forEach(ct => {
        if ((world.content || []).some(e => e.kind === ct.id)) {
          tocLinks.push(`<a href="#type-${esc(ct.id)}">${esc(ct.label)}</a>`)
        }
      })
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${esc(world.meta?.name || 'Compendium')} — Compendium</title>
<style>${EMBEDDED_CSS}</style></head>
<body>
<nav class="toc"><h1>${esc(world.meta?.name || 'Compendium')}</h1>${tocLinks.join('')}</nav>
<main>${sections.join('\n')}</main>
</body></html>`
}
