// ─── Global state ────────────────────────────────────────────────────────────
window.state = null
let _dirty = false
let _saveTimer = null

// ─── DOM helper ──────────────────────────────────────────────────────────────
window.el = function(tag, props, ...children) {
  if (typeof props === 'string' || props instanceof Node) {
    children.unshift(props)
    props = {}
  }
  props = props || {}
  const e = document.createElement(tag)
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v
    else if (k === 'onclick') e.onclick = v
    else if (k === 'onchange') e.onchange = v
    else if (k === 'oninput') e.oninput = v
    else if (k === 'onkeydown') e.onkeydown = v
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v)
    else e.setAttribute(k, v)
  }
  for (const c of children.flat(Infinity)) {
    if (c == null) continue
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c)
  }
  return e
}

// ─── Slugify ─────────────────────────────────────────────────────────────────
window.slugify = function(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ─── Status message ──────────────────────────────────────────────────────────
window.showStatus = function(msg, error = false) {
  const el = document.getElementById('status-msg')
  if (!el) return
  el.textContent = msg
  el.style.color = error ? '#ffaaaa' : 'rgba(255,255,255,.9)'
  clearTimeout(window._statusTimer)
  window._statusTimer = setTimeout(() => { el.textContent = '' }, 3000)
}

// ─── Save / load ─────────────────────────────────────────────────────────────
window.markDirty = function() {
  _dirty = true
  clearTimeout(_saveTimer)
  _saveTimer = setTimeout(saveWorld, 1200)
}

async function saveWorld() {
  if (!window.state) return
  try {
    const res = await fetch('/api/world', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(window.state)
    })
    if (!res.ok) throw new Error(await res.text())
    _dirty = false
    showStatus('Saved')
  } catch (e) {
    showStatus('Save failed: ' + e.message, true)
  }
}

async function loadWorld() {
  try {
    const res = await fetch('/api/world')
    if (!res.ok) throw new Error(await res.text())
    window.state = await res.json()
    navigate('system')
  } catch (e) {
    showStatus('Load failed: ' + e.message, true)
  }
}

// ─── Navigation ──────────────────────────────────────────────────────────────
window.navigate = function(section) {
  document.querySelectorAll('#nav-list li[data-section]').forEach(li => {
    li.classList.toggle('active', li.dataset.section === section)
  })
  const container = document.getElementById('content')
  container.innerHTML = ''

  switch (section) {
    case 'system':        renderSystemSection(container); break
    case 'dice':          renderDiceSection(container); break
    case 'attributes':    renderAttributesSection(container); break
    case 'skills':        renderSkillsSection(container); break
    case 'derived':       renderDerivedSection(container); break
    case 'resources':     renderResourcesSection(container); break
    case 'content-types': renderContentTypesSection(container); break
    case 'content':       renderContentSection(container); break
    case 'creation':      renderCreationSection(container); break
    case 'advancement':   renderAdvancementSection(container); break
    case 'preview':       renderPreviewSection(container); break
    case 'export':        renderExportSection(container); break
  }
}

// ─── Export section ──────────────────────────────────────────────────────────
window.renderExportSection = function(container) {
  let outputDir = ''
  const log = el('div', { class: 'export-log' }, 'Ready to export.')
  const dirInput = el('input', { type: 'text', placeholder: '/path/to/my-system-package' })
  dirInput.oninput = () => { outputDir = dirInput.value }

  const btn = el('button', { class: 'btn btn-primary', onclick: async () => {
    if (!outputDir) { showStatus('Enter an output directory first', true); return }
    log.textContent = 'Exporting…'
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world: window.state, outputDir })
      })
      const data = await res.json()
      if (!res.ok) { log.textContent = 'Error: ' + data.error; return }
      log.textContent = 'Exported:\n' + data.files.join('\n')
    } catch (e) {
      log.textContent = 'Error: ' + e.message
    }
  }}, 'Export All Files')

  container.append(
    el('h2', { class: 'section-title' }, 'Export'),
    el('p', { style: { color: '#666', marginBottom: '20px' } },
      'Writes a complete Foundry game system: system.json, TypeScript source (CharacterData, CharacterSheet), build tooling (package.json, vite.config.ts, tsconfig.json), and DTK artifacts (modus.json, ritus.json, codex.json, forma.json, exemplars/*.yaml, promptuarium.config.yaml).'),
    el('div', { class: 'card' },
      el('div', { class: 'field-row' },
        el('label', 'Output Directory (absolute path)'),
        dirInput,
        el('p', { class: 'field-hint' }, 'e.g. /Users/you/projects/my-system')
      ),
      btn
    ),
    el('div', { class: 'card', style: { marginTop: '16px' } }, log)
  )
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-save').onclick = saveWorld

  document.querySelectorAll('#nav-list li[data-section]').forEach(li => {
    li.onclick = () => navigate(li.dataset.section)
  })

  loadWorld()
})
