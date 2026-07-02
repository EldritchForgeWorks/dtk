const FIELD_TYPES = ['text','number','select','allocation','priority-matrix','derived','custom','exemplar-grid']

function txtInput(val, onch, ph) {
  const i = el('input', { type: 'text', value: val || '', placeholder: ph || '' })
  i.oninput = () => onch(i.value)
  return i
}

function numInput(val, onch) {
  const i = el('input', { type: 'number', value: val ?? '' })
  i.oninput = () => onch(i.value === '' ? null : Number(i.value))
  return i
}

// ─── Field extras ─────────────────────────────────────────────────────────────
function renderFieldExtras(field, onChange) {
  const wrap = el('div')
  switch (field.type) {
    case 'text': {
      const cb = el('input', { type: 'checkbox' }); cb.checked = !!field.required
      cb.onchange = () => { field.required = cb.checked; onChange() }
      wrap.append(el('div', { class: 'checkbox-row' }, cb, el('label', 'Required')))
      break
    }
    case 'number': {
      const cb = el('input', { type: 'checkbox' }); cb.checked = !!field.required
      cb.onchange = () => { field.required = cb.checked; onChange() }
      wrap.append(
        el('div', { class: 'field-row-inline' },
          el('div', { class: 'field-row' }, el('label', 'Min'), numInput(field.min, v => { field.min = v; onChange() })),
          el('div', { class: 'field-row' }, el('label', 'Max'), numInput(field.max, v => { field.max = v; onChange() }))
        ),
        el('div', { class: 'checkbox-row' }, cb, el('label', 'Required'))
      )
      break
    }
    case 'select': {
      if (!field.options) field.options = []
      const listEl = el('div')
      function rebuildOpts() {
        listEl.innerHTML = ''
        field.options.forEach((opt, i) => {
          const vInp = txtInput(opt.value, v => { opt.value = v; onChange() }, 'value')
          const lInp = txtInput(opt.label, v => { opt.label = v; onChange() }, 'label')
          const del = el('button', { class: 'btn btn-danger btn-sm', onclick: () => { field.options.splice(i,1); onChange(); rebuildOpts() } }, '×')
          listEl.append(el('div', { style: { display:'flex', gap:'6px', marginBottom:'4px', alignItems:'center' } }, vInp, lInp, del))
        })
      }
      rebuildOpts()
      wrap.append(el('label', { style: { fontSize:'12px', color:'#666', fontWeight:'600' } }, 'OPTIONS'), listEl,
        el('button', { class: 'btn btn-secondary btn-sm', onclick: () => { field.options.push({value:'',label:''}); onChange(); rebuildOpts() } }, '+ Option'))
      break
    }
    case 'allocation':
      wrap.append(
        el('div', { class: 'field-row' }, el('label', 'Point Pool'), txtInput(field.pool, v => { field.pool = v; onChange() }, '@attributes.body + 27')),
        el('div', { class: 'field-row' }, el('label', 'Targets (comma-separated IDs)'), txtInput((field.targets||[]).join(','), v => { field.targets = v.split(',').map(x=>x.trim()).filter(Boolean); onChange() }, 'body,agility,reaction'))
      )
      break
    case 'priority-matrix':
      wrap.append(
        el('div', { class: 'field-row' }, el('label', 'Priorities'), txtInput((field.priorities||[]).join(','), v => { field.priorities = v.split(',').map(x=>x.trim()); onChange() }, 'A,B,C,D,E')),
        el('div', { class: 'field-row' }, el('label', 'Choices'), txtInput((field.choices||[]).join(','), v => { field.choices = v.split(',').map(x=>x.trim()); onChange() }, 'metatype,attributes,skills,magic,resources'))
      )
      break
    case 'derived':
      wrap.append(el('div', { class: 'field-row' }, el('label', 'Formula'), txtInput(field.formula, v => { field.formula = v; onChange() }, '@body + @agility')))
      break
    case 'exemplar-grid': {
      const ctypes = (window.state.contentTypes || [])
      const ctSel = el('select')
      ctSel.append(el('option', { value: '' }, '— select kind —'))
      ctypes.forEach(ct => { const o = el('option', { value: ct.id }, ct.label || ct.id); if (ct.id === field.kind) o.selected = true; ctSel.append(o) })
      ctSel.onchange = () => { field.kind = ctSel.value; onChange() }
      wrap.append(
        el('div', { class: 'field-row' }, el('label', 'Exemplar Kind'), ctSel),
        el('div', { class: 'field-row' }, el('label', 'System ID (optional)'), txtInput(field.systemId, v => { field.systemId = v || undefined; onChange() })),
        el('div', { class: 'field-row' }, el('label', 'Parent Step ID (optional)'), txtInput(field.parentStepId, v => { field.parentStepId = v; onChange() })),
        el('div', { class: 'field-row' }, el('label', 'Filter expression (optional)'), txtInput(field.filter, v => { field.filter = v; onChange() }))
      )
      break
    }
    case 'custom':
      wrap.append(el('div', { class: 'field-row' }, el('label', 'Component ID'), txtInput(field.componentId, v => { field.componentId = v; onChange() })))
      break
  }
  return wrap
}

// ─── Step card ────────────────────────────────────────────────────────────────
function renderStepCard(step, idx, steps, onRerender) {
  const card = el('div', { class: 'step-card' })
  const headerLabel = el('span', { class: 'step-card-label' },
    el('span', { class: 'step-num' }, String(idx + 1)),
    step.label || 'New Step'
  )
  const actions = el('div', { style: { display:'flex', gap:'4px' } })
  if (idx > 0) {
    actions.append(el('button', { class: 'btn btn-secondary btn-sm', onclick: e => { e.stopPropagation(); const tmp = steps[idx-1]; steps[idx-1] = steps[idx]; steps[idx] = tmp; window.markDirty(); onRerender() } }, '↑'))
  }
  if (idx < steps.length - 1) {
    actions.append(el('button', { class: 'btn btn-secondary btn-sm', onclick: e => { e.stopPropagation(); const tmp = steps[idx+1]; steps[idx+1] = steps[idx]; steps[idx] = tmp; window.markDirty(); onRerender() } }, '↓'))
  }
  actions.append(el('button', { class: 'btn btn-danger btn-sm', onclick: e => { e.stopPropagation(); steps.splice(idx,1); window.markDirty(); onRerender() } }, 'Delete'))
  const header = el('div', { class: 'step-card-header', onclick: () => card.classList.toggle('open') }, headerLabel, actions)

  const body = el('div', { class: 'step-card-body' })
  const hintArea = el('textarea', { placeholder: 'Hint shown to the player at this step…' }, step.hint || '')
  hintArea.oninput = () => { step.hint = hintArea.value; window.markDirty() }

  body.append(
    el('div', { class: 'field-row-inline' },
      el('div', { class: 'field-row' }, el('label', 'Step ID'), txtInput(step.id, v => { step.id = v; window.markDirty() }, 'step-id')),
      el('div', { class: 'field-row' }, el('label', 'Label'), txtInput(step.label, v => { step.label = v; headerLabel.childNodes[1].textContent = v || 'New Step'; window.markDirty() }, 'Step label'))
    ),
    el('div', { class: 'field-row' }, el('label', 'Hint'), hintArea),
    el('h4', { style: { margin: '16px 0 8px', fontSize:'12px', fontWeight:'700', color:'#666', textTransform:'uppercase' } }, 'Fields')
  )

  const fieldsWrap = el('div')
  if (!step.fields) step.fields = []

  function rebuildFields() {
    fieldsWrap.innerHTML = ''
    step.fields.forEach((field, fi) => {
      const typeSel = el('select')
      FIELD_TYPES.forEach(ft => { const o = el('option', { value: ft }, ft); if (ft === field.type) o.selected = true; typeSel.append(o) })
      typeSel.onchange = () => { field.type = typeSel.value; window.markDirty(); rebuildFields() }
      const extras = renderFieldExtras(field, () => window.markDirty())
      fieldsWrap.append(el('div', { class: 'list-row', style: { flexDirection:'column' } },
        el('div', { style: { display:'flex', gap:'6px', width:'100%', alignItems:'flex-start' } },
          el('div', { class: 'field-row', style: { minWidth:'120px', marginBottom:0 } }, el('label', 'Type'), typeSel),
          el('div', { class: 'field-row', style: { flex:1, marginBottom:0 } }, el('label', 'Field ID'), txtInput(field.id, v => { field.id = v; window.markDirty() })),
          el('div', { class: 'field-row', style: { flex:1, marginBottom:0 } }, el('label', 'Label'), txtInput(field.label, v => { field.label = v; window.markDirty() })),
          el('button', { class: 'btn btn-danger btn-sm', style: { marginTop:'18px', flexShrink:'0' }, onclick: () => { step.fields.splice(fi,1); window.markDirty(); rebuildFields() } }, '×')
        ),
        extras
      ))
    })
    fieldsWrap.append(el('button', { class: 'btn btn-secondary btn-sm', onclick: () => {
      step.fields.push({ type: 'text', id: '', label: '' }); window.markDirty(); rebuildFields()
    }}, '+ Add Field'))
  }
  rebuildFields()
  body.append(fieldsWrap)
  card.append(header, body)
  return card
}

// ─── Creation section ─────────────────────────────────────────────────────────
window.renderCreationSection = function(container) {
  if (!window.state.creation) window.state.creation = { id: '', mode: 'steps', steps: [], advancementTracks: [] }
  const c = window.state.creation
  if (!c.steps) c.steps = []
  const stepsWrap = el('div')

  function rebuildSteps() {
    stepsWrap.innerHTML = ''
    c.steps.forEach((step, i) => stepsWrap.append(renderStepCard(step, i, c.steps, rebuildSteps)))
    stepsWrap.append(el('button', { class: 'btn btn-secondary', onclick: () => {
      c.steps.push({ id: '', label: '', hint: '', fields: [] }); window.markDirty(); rebuildSteps()
    }}, '+ Add Step'))
  }

  container.append(el('h2', { class: 'section-title' }, 'Character Creation'), stepsWrap)
  rebuildSteps()
}

// ─── Advancement section ──────────────────────────────────────────────────────
window.renderAdvancementSection = function(container) {
  if (!window.state.creation) window.state.creation = { id: '', mode: 'steps', steps: [], advancementTracks: [] }
  const c = window.state.creation
  if (!c.advancementTracks) c.advancementTracks = []
  const wrap = el('div')

  function rebuildTracks() {
    wrap.innerHTML = ''
    c.advancementTracks.forEach((track, ti) => {
      if (!track.advancements) track.advancements = []
      const advsWrap = el('div')

      function rebuildAdvs() {
        advsWrap.innerHTML = ''
        track.advancements.forEach((adv, ai) => {
          advsWrap.append(el('div', { class: 'list-row' },
            el('div', { class: 'list-row-body' },
              el('div', { class: 'field-row-inline' },
                el('div', { class: 'field-row' }, el('label', 'ID'), txtInput(adv.id, v => { adv.id=v; window.markDirty() })),
                el('div', { class: 'field-row' }, el('label', 'Label'), txtInput(adv.label, v => { adv.label=v; window.markDirty() })),
                el('div', { class: 'field-row' }, el('label', 'Cost'), numInput(adv.cost, v => { adv.cost=v; window.markDirty() })),
                el('div', { class: 'field-row' }, el('label', 'Prerequisite'), txtInput(adv.prerequisite, v => { adv.prerequisite=v; window.markDirty() })),
                el('div', { class: 'field-row' }, el('label', 'Unlock Step'), txtInput(adv.unlockStep, v => { adv.unlockStep=v; window.markDirty() }))
              )
            ),
            el('div', { class: 'list-row-actions' },
              el('button', { class: 'btn btn-danger btn-sm', onclick: () => { track.advancements.splice(ai,1); window.markDirty(); rebuildAdvs() } }, '×')
            )
          ))
        })
        advsWrap.append(el('button', { class: 'btn btn-secondary btn-sm', onclick: () => {
          track.advancements.push({ id:'', label:'', cost:10 }); window.markDirty(); rebuildAdvs()
        }}, '+ Add Advancement'))
      }
      rebuildAdvs()

      wrap.append(el('div', { class: 'card' },
        el('div', { class: 'field-row-inline' },
          el('div', { class: 'field-row' }, el('label', 'Track ID'), txtInput(track.id, v => { track.id=v; window.markDirty() })),
          el('div', { class: 'field-row' }, el('label', 'Label'), txtInput(track.label, v => { track.label=v; window.markDirty() })),
          el('button', { class: 'btn btn-danger btn-sm', style: { marginTop:'18px', flexShrink:'0' }, onclick: () => { c.advancementTracks.splice(ti,1); window.markDirty(); rebuildTracks() } }, 'Delete Track')
        ),
        el('div', { class: 'field-row' },
          el('label', 'XP Table (comma-separated thresholds per level)'),
          txtInput((track.xpTable||[]).join(','), v => { track.xpTable = v.split(',').map(x=>Number(x.trim())).filter(n=>!isNaN(n)); window.markDirty() }, '0,100,250,500,1000')
        ),
        el('h4', { style: { margin:'12px 0 8px', fontSize:'12px', fontWeight:'700', color:'#666', textTransform:'uppercase' } }, 'Advancements'),
        advsWrap
      ))
    })
    wrap.append(el('button', { class: 'btn btn-secondary', onclick: () => {
      c.advancementTracks.push({ id:'', label:'', xpTable:[], advancements:[] }); window.markDirty(); rebuildTracks()
    }}, '+ Add Track'))
  }

  container.append(el('h2', { class: 'section-title' }, 'Advancement Tracks'), wrap)
  rebuildTracks()
}
