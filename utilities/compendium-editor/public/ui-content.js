let _selIdx = -1
let _filterType = 'all'
let _search = ''

function cTxt(val, onch, ph) {
  const i = el('input', { type: 'text', value: val || '', placeholder: ph || '' })
  i.oninput = () => onch(i.value)
  return i
}
function cNum(val, onch, min, max) {
  const attrs = { type: 'number', value: val ?? '' }
  if (min != null) attrs.min = String(min)
  if (max != null) attrs.max = String(max)
  const i = el('input', attrs)
  i.oninput = () => onch(i.value === '' ? null : Number(i.value))
  return i
}
function cTa(val, onch, ph) {
  const ta = el('textarea', { placeholder: ph || '' }, val || '')
  ta.oninput = () => onch(ta.value)
  return ta
}

function renderDynamicFields(entry, editPanel) {
  const ct = (window.state.contentTypes || []).find(t => t.id === entry.kind)
  const section = el('div', { style: { marginTop: '16px' } })

  if (!ct || !ct.fields || !ct.fields.length) {
    section.append(el('p', { style: { color: '#999', fontStyle: 'italic', fontSize: '13px' } },
      'Select a Content Type and define its fields under Content Types.'))
    editPanel.append(section)
    return
  }

  if (!entry.data) entry.data = {}
  section.append(el('h4', { style: { margin: '0 0 10px', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase' } },
    `— ${ct.label} Fields —`))

  ct.fields.forEach(field => {
    let widget
    switch (field.type) {
      case 'number':
        widget = cNum(entry.data[field.id], v => { entry.data[field.id] = v; window.markDirty() }, field.min, field.max)
        break
      case 'select': {
        const sel = el('select')
        sel.append(el('option', { value: '' }, '—'))
        ;(field.options || []).forEach(o => {
          const opt = el('option', { value: o.value }, o.label || o.value)
          if (o.value === entry.data[field.id]) opt.selected = true
          sel.append(opt)
        })
        sel.onchange = () => { entry.data[field.id] = sel.value; window.markDirty() }
        widget = sel
        break
      }
      case 'boolean': {
        const cb = el('input', { type: 'checkbox' }); cb.checked = !!entry.data[field.id]
        cb.onchange = () => { entry.data[field.id] = cb.checked; window.markDirty() }
        widget = el('div', { class: 'checkbox-row' }, cb, el('label', field.label))
        section.append(el('div', { style: { marginBottom: '8px' } }, widget))
        return
      }
      case 'tags': {
        const arr = Array.isArray(entry.data[field.id]) ? entry.data[field.id] : []
        widget = cTxt(arr.join(', '), v => { entry.data[field.id] = v.split(',').map(s => s.trim()).filter(Boolean); window.markDirty() }, 'tag1, tag2')
        break
      }
      case 'textarea':
        widget = cTa(entry.data[field.id], v => { entry.data[field.id] = v; window.markDirty() }, field.label)
        break
      default:
        widget = cTxt(entry.data[field.id], v => { entry.data[field.id] = v; window.markDirty() })
    }
    section.append(el('div', { class: 'field-row' }, el('label', field.label + (field.required ? ' *' : '')), widget))
  })
  editPanel.append(section)
}

function renderEntryEdit(entry, editPanel, onRerender) {
  editPanel.innerHTML = ''
  if (!entry) {
    editPanel.append(el('div', { class: 'exemplar-empty' }, 'Select an entry to edit or create a new one'))
    return
  }

  const types = window.state.contentTypes || []
  const typeSel = el('select')
  typeSel.append(el('option', { value: '' }, '— Select Kind —'))
  types.forEach(t => { const o = el('option', { value: t.id }, t.label || t.id); if (t.id === entry.kind) o.selected = true; typeSel.append(o) })
  typeSel.onchange = () => { entry.kind = typeSel.value; entry.data = {}; window.markDirty(); onRerender() }

  const idInp = cTxt(entry.id, v => { entry.id = v; window.markDirty(); onRerender() })
  const verInp = cTxt(entry.version, v => { entry.version = v; window.markDirty() }, '0.1.0')
  const nameInp = cTxt(entry.name, v => { entry.name = v; window.markDirty(); onRerender() })
  const descTa = cTa(entry.description, v => { entry.description = v; window.markDirty() }, 'Describe this entry for players…')
  const tagsInp = cTxt((entry.tags || []).join(', '), v => { entry.tags = v.split(',').map(s => s.trim()).filter(Boolean); window.markDirty() }, 'tag1, tag2')

  editPanel.append(
    el('div', { class: 'field-row' }, el('label', 'Kind'), typeSel),
    el('div', { class: 'field-row-inline' },
      el('div', { class: 'field-row' }, el('label', 'ID'), idInp),
      el('div', { class: 'field-row' }, el('label', 'Version'), verInp)
    ),
    el('div', { class: 'field-row' }, el('label', 'Name'), nameInp),
    el('div', { class: 'field-row' }, el('label', 'Description (player-facing)'), descTa),
    el('div', { class: 'field-row' }, el('label', 'Tags (comma-separated)'), tagsInp)
  )

  renderDynamicFields(entry, editPanel)

  editPanel.append(
    el('div', { style: { marginTop: '24px', borderTop: '1px solid #eee', paddingTop: '16px' } },
      el('button', { class: 'btn btn-danger', onclick: () => {
        const idx = window.state.content.indexOf(entry)
        if (idx >= 0) { window.state.content.splice(idx, 1); _selIdx = -1; window.markDirty(); onRerender() }
      }}, 'Delete Entry')
    )
  )
}

window.renderContentSection = function(container) {
  container.innerHTML = ''
  const layout = el('div', { class: 'exemplar-layout' })
  const listPanel = el('div', { class: 'exemplar-list-panel' })
  const editPanel = el('div', { class: 'exemplar-edit-panel' })

  const types = window.state.contentTypes || []
  const typeSel = el('select')
  typeSel.append(el('option', { value: 'all' }, 'All Types'))
  types.forEach(t => { const o = el('option', { value: t.id }, t.label || t.id); if (t.id === _filterType) o.selected = true; typeSel.append(o) })
  typeSel.onchange = () => { _filterType = typeSel.value; rebuildList() }

  const searchInp = el('input', { type: 'text', placeholder: 'Search…', value: _search })
  searchInp.oninput = () => { _search = searchInp.value; rebuildList() }

  const listScroll = el('div', { class: 'exemplar-list-scroll' })

  function rebuildList() {
    listScroll.innerHTML = ''
    const q = _search.toLowerCase()
    ;(window.state.content || []).forEach((entry, i) => {
      if (_filterType !== 'all' && entry.kind !== _filterType) return
      if (q && !(entry.name || '').toLowerCase().includes(q) && !(entry.id || '').toLowerCase().includes(q)) return
      const typeLabel = types.find(t => t.id === entry.kind)?.label || entry.kind || '?'
      const item = el('div', { class: 'exemplar-list-item' + (i === _selIdx ? ' active' : '') },
        el('div', { class: 'exemplar-list-item-name' },
          entry.name || '(unnamed)',
          el('span', { class: `kind-badge kind-${entry.kind}` }, typeLabel)
        ),
        el('div', { class: 'exemplar-list-item-desc' }, (entry.description || '').slice(0, 60) || 'No description')
      )
      item.onclick = () => {
        _selIdx = i; rebuildList()
        renderEntryEdit(window.state.content[i], editPanel, () => { rebuildList(); renderEntryEdit(window.state.content[_selIdx], editPanel, () => rebuildList()) })
      }
      listScroll.append(item)
    })
  }

  const footer = el('div', { class: 'exemplar-list-footer' },
    el('button', { class: 'btn btn-primary', style: { width: '100%' }, onclick: () => {
      const firstType = types[0]?.id || ''
      const entry = { id: '', kind: firstType, version: '0.1.0', name: '', description: '', tags: [], data: {} }
      if (!window.state.content) window.state.content = []
      window.state.content.push(entry)
      _selIdx = window.state.content.length - 1
      window.markDirty(); rebuildList()
      renderEntryEdit(entry, editPanel, () => { rebuildList(); renderEntryEdit(window.state.content[_selIdx], editPanel, () => rebuildList()) })
    }}, '+ New Entry')
  )

  listPanel.append(
    el('div', { class: 'exemplar-list-controls' }, typeSel, searchInp),
    listScroll,
    footer
  )

  rebuildList()
  const selected = _selIdx >= 0 ? (window.state.content || [])[_selIdx] : null
  renderEntryEdit(selected, editPanel, () => {
    rebuildList()
    if (_selIdx >= 0) renderEntryEdit(window.state.content[_selIdx], editPanel, () => rebuildList())
  })

  layout.append(listPanel, editPanel)
  container.append(el('h2', { class: 'section-title' }, 'Compendium'), layout)
}
