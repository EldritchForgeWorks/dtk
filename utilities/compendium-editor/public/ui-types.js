let _typeSelIdx = -1

const CT_FIELD_TYPES = ['text','number','select','boolean','tags','textarea']
const DOC_TYPES = ['Item', 'Actor', 'ActiveEffect']
const DOC_TYPE_LABEL = { Item: 'Item', Actor: 'Actor', ActiveEffect: 'FX' }

function ctTxt(val, onch, ph) {
  const i = el('input', { type: 'text', value: val || '', placeholder: ph || '' })
  i.oninput = () => onch(i.value)
  return i
}
function ctNum(val, onch) {
  const i = el('input', { type: 'number', value: val ?? '' })
  i.oninput = () => onch(i.value === '' ? null : Number(i.value))
  return i
}

function renderFieldExtrasForType(field, onChange) {
  const wrap = el('div', { style: { marginTop: '6px' } })
  if (field.type === 'number') {
    wrap.append(el('div', { class: 'field-row-inline' },
      el('div', { class: 'field-row' }, el('label', 'Min (optional)'), ctNum(field.min, v => { field.min = v; onChange() })),
      el('div', { class: 'field-row' }, el('label', 'Max (optional)'), ctNum(field.max, v => { field.max = v; onChange() }))
    ))
  }
  if (field.type === 'select') {
    if (!field.options) field.options = []
    const listEl = el('div')
    function rebuildOpts() {
      listEl.innerHTML = ''
      field.options.forEach((opt, oi) => {
        const del = el('button', { class: 'btn btn-danger btn-sm', onclick: () => { field.options.splice(oi, 1); onChange(); rebuildOpts() } }, '×')
        listEl.append(el('div', { style: { display: 'flex', gap: '6px', marginBottom: '4px', alignItems: 'center' } },
          ctTxt(opt.value, v => { opt.value = v; onChange() }, 'value'),
          ctTxt(opt.label, v => { opt.label = v; onChange() }, 'label'),
          del
        ))
      })
    }
    rebuildOpts()
    wrap.append(
      el('label', { style: { fontSize: '12px', color: '#666', fontWeight: '600' } }, 'OPTIONS'),
      listEl,
      el('button', { class: 'btn btn-secondary btn-sm', onclick: () => { field.options.push({ value: '', label: '' }); onChange(); rebuildOpts() } }, '+ Option')
    )
  }
  const reqCb = el('input', { type: 'checkbox' }); reqCb.checked = !!field.required
  reqCb.onchange = () => { field.required = reqCb.checked; onChange() }
  wrap.append(el('div', { class: 'checkbox-row', style: { marginTop: '6px' } }, reqCb, el('label', 'Required')))
  return wrap
}

function renderTypeEditor(ct, editPanel, onRerender) {
  editPanel.innerHTML = ''
  if (!ct) {
    editPanel.append(el('div', { class: 'exemplar-empty' }, 'Select a content type to edit or create a new one'))
    return
  }

  const docSel = el('select')
  DOC_TYPES.forEach(dt => {
    const o = el('option', { value: dt }, dt)
    if ((ct.documentType || 'Item') === dt) o.selected = true
    docSel.append(o)
  })
  docSel.onchange = () => { ct.documentType = docSel.value; window.markDirty(); onRerender() }

  const labelInp = ctTxt(ct.label, v => {
    ct.label = v; ct.id = window.slugify(v); idInp.value = ct.id; window.markDirty(); onRerender()
  }, 'Spell')
  const idInp = ctTxt(ct.id, v => { ct.id = v; window.markDirty() }, 'spell')

  if (!ct.fields) ct.fields = []
  const fieldsWrap = el('div')

  function rebuildFields() {
    fieldsWrap.innerHTML = ''
    ct.fields.forEach((field, fi) => {
      const typeSel = el('select')
      CT_FIELD_TYPES.forEach(ft => { const o = el('option', { value: ft }, ft); if (ft === field.type) o.selected = true; typeSel.append(o) })
      typeSel.onchange = () => { field.type = typeSel.value; window.markDirty(); rebuildFields() }

      const extras = renderFieldExtrasForType(field, () => window.markDirty())
      fieldsWrap.append(el('div', { class: 'list-row', style: { flexDirection: 'column', alignItems: 'stretch' } },
        el('div', { style: { display: 'flex', gap: '6px', width: '100%', alignItems: 'flex-start' } },
          el('div', { class: 'field-row', style: { flex: 1, marginBottom: 0 } }, el('label', 'ID'), ctTxt(field.id, v => { field.id = v; window.markDirty() })),
          el('div', { class: 'field-row', style: { flex: 1, marginBottom: 0 } }, el('label', 'Label'), ctTxt(field.label, v => { field.label = v; window.markDirty() })),
          el('div', { class: 'field-row', style: { flex: '0 0 110px', marginBottom: 0 } }, el('label', 'Type'), typeSel),
          el('button', { class: 'btn btn-danger btn-sm', style: { marginTop: '18px', flexShrink: 0 }, onclick: () => { ct.fields.splice(fi, 1); window.markDirty(); rebuildFields() } }, '×')
        ),
        extras
      ))
    })
    fieldsWrap.append(el('button', { class: 'btn btn-secondary btn-sm', onclick: () => {
      ct.fields.push({ id: '', label: '', type: 'text', required: false }); window.markDirty(); rebuildFields()
    }}, '+ Add Field'))
  }
  rebuildFields()

  editPanel.append(
    el('div', { class: 'field-row' }, el('label', 'Document Type'), docSel),
    el('div', { class: 'field-row-inline' },
      el('div', { class: 'field-row' }, el('label', 'Label'), labelInp),
      el('div', { class: 'field-row' }, el('label', 'ID'), idInp)
    ),
    el('h4', { style: { margin: '16px 0 8px', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase' } }, 'Fields'),
    fieldsWrap,
    el('div', { style: { marginTop: '24px', borderTop: '1px solid #eee', paddingTop: '16px' } },
      el('button', { class: 'btn btn-danger', onclick: () => {
        const idx = window.state.contentTypes.indexOf(ct)
        if (idx >= 0) { window.state.contentTypes.splice(idx, 1); _typeSelIdx = -1; window.markDirty(); onRerender() }
      }}, 'Delete Type')
    )
  )
}

window.renderContentTypesSection = function(container) {
  container.innerHTML = ''
  const layout = el('div', { class: 'exemplar-layout' })
  const listPanel = el('div', { class: 'exemplar-list-panel' })
  const editPanel = el('div', { class: 'exemplar-edit-panel' })
  const listScroll = el('div', { class: 'exemplar-list-scroll' })

  function rebuildList() {
    listScroll.innerHTML = ''
    window.state.contentTypes.forEach((ct, i) => {
      const docLabel = DOC_TYPE_LABEL[ct.documentType || 'Item'] || 'Item'
      const item = el('div', { class: 'exemplar-list-item' + (i === _typeSelIdx ? ' active' : '') },
        el('div', { class: 'exemplar-list-item-name' },
          ct.label || '(unnamed)',
          el('span', { class: `kind-badge kind-${(ct.documentType || 'item').toLowerCase()}` }, docLabel),
          el('span', { class: 'kind-badge' }, String((ct.fields || []).length) + ' fields')
        ),
        el('div', { class: 'exemplar-list-item-desc' }, ct.id || 'no id')
      )
      item.onclick = () => {
        _typeSelIdx = i
        rebuildList()
        renderTypeEditor(window.state.contentTypes[i], editPanel, () => { rebuildList(); renderTypeEditor(window.state.contentTypes[_typeSelIdx], editPanel, () => rebuildList()) })
      }
      listScroll.append(item)
    })
  }

  const footer = el('div', { class: 'exemplar-list-footer' },
    el('button', { class: 'btn btn-primary', style: { width: '100%' }, onclick: () => {
      const ct = { id: '', label: '', documentType: 'Item', fields: [] }
      window.state.contentTypes.push(ct)
      _typeSelIdx = window.state.contentTypes.length - 1
      window.markDirty(); rebuildList()
      renderTypeEditor(ct, editPanel, () => { rebuildList(); renderTypeEditor(window.state.contentTypes[_typeSelIdx], editPanel, () => rebuildList()) })
    }}, '+ New Type')
  )

  listPanel.append(listScroll, footer)
  rebuildList()
  const selected = _typeSelIdx >= 0 ? window.state.contentTypes[_typeSelIdx] : null
  renderTypeEditor(selected, editPanel, () => {
    rebuildList()
    if (_typeSelIdx >= 0) renderTypeEditor(window.state.contentTypes[_typeSelIdx], editPanel, () => rebuildList())
  })

  layout.append(listPanel, editPanel)
  container.append(
    el('h2', { class: 'section-title' }, 'Types'),
    el('p', { style: { color: '#666', marginBottom: '16px' } }, 'Define document types for your system — Items (spells, feats, gear), Actors (NPC, vehicle), or ActiveEffects (conditions, buffs). Each type gets its own field schema and TypeDataModel.'),
    layout
  )
}
