// ─── Shared input helpers ─────────────────────────────────────────────────────
function txtI(val, onch, ph) {
  const i = el('input', { type: 'text', value: val || '', placeholder: ph || '' })
  i.oninput = () => onch(i.value)
  return i
}
function numI(val, onch, min) {
  const i = el('input', { type: 'number', value: val ?? '', min: String(min ?? 0) })
  i.oninput = () => onch(i.value === '' ? null : Number(i.value))
  return i
}
function taI(val, onch, ph) {
  const ta = el('textarea', { placeholder: ph || '' }, val || '')
  ta.oninput = () => onch(ta.value)
  return ta
}

// ─── System Info ─────────────────────────────────────────────────────────────
window.renderSystemSection = function(container) {
  const m = window.state.meta
  if (!window.state.plugin) window.state.plugin = { compatibility: { minimum: '12', verified: '14' } }
  const compat = window.state.plugin.compatibility

  const nameInput = el('input', { type: 'text', value: m.name || '' })
  const idInput = el('input', { type: 'text', value: m.systemId || '', readonly: '' })
  idInput.style.background = '#f8f8fc'; idInput.style.color = '#999'
  nameInput.oninput = () => {
    m.name = nameInput.value
    m.systemId = window.slugify(nameInput.value)
    idInput.value = m.systemId
    window.markDirty()
  }
  const descInput = taI(m.description, v => { m.description = v; window.markDirty() }, 'A brief description of this game system…')
  const verInput  = txtI(m.version, v => { m.version = v; window.markDirty() })
  const minInput  = txtI(compat.minimum,  v => { compat.minimum  = v; window.markDirty() }, '12')
  const verfInput = txtI(compat.verified, v => { compat.verified = v; window.markDirty() }, '14')

  const presetSel = el('select')
  presetSel.append(el('option', { value: '' }, '— Load a preset —'))
  fetch('/api/presets').then(r => r.json()).then(presets => {
    presets.forEach(p => {
      const label = p.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      presetSel.append(el('option', { value: p }, label))
    })
  }).catch(() => {})

  const loadBtn = el('button', { class: 'btn btn-secondary', onclick: async () => {
    if (!presetSel.value) return
    if (!confirm(`Load "${presetSel.value}" preset? This will replace your current system.`)) return
    const res = await fetch(`/api/presets/${presetSel.value}`)
    if (!res.ok) { window.showStatus('Preset not found', true); return }
    const preset = await res.json()
    Object.assign(window.state, preset)
    window.markDirty()
    window.navigate('system')
    window.showStatus(`Loaded: ${presetSel.value}`)
  }}, 'Load')

  container.append(
    el('h2', { class: 'section-title' }, 'System Info'),
    el('div', { class: 'card' },
      el('div', { class: 'field-row' }, el('label', 'System Name'), nameInput),
      el('div', { class: 'field-row' },
        el('label', 'System ID'), idInput,
        el('p', { class: 'field-hint' }, 'Auto-generated from name.')
      ),
      el('div', { class: 'field-row' }, el('label', 'Description'), descInput),
      el('div', { class: 'field-row' }, el('label', 'Version'), verInput),
      el('div', { class: 'field-row-inline' },
        el('div', { class: 'field-row' },
          el('label', 'Foundry Minimum'),
          minInput,
          el('p', { class: 'field-hint' }, 'Minimum Foundry version')
        ),
        el('div', { class: 'field-row' },
          el('label', 'Foundry Verified'),
          verfInput,
          el('p', { class: 'field-hint' }, 'Tested Foundry version')
        )
      )
    ),
    el('div', { class: 'card', style: { marginTop: '16px' } },
      el('h3', { class: 'section-subtitle' }, 'Load Preset'),
      el('p', { class: 'field-hint', style: { marginBottom: '10px' } }, 'Start from a pre-built system definition.'),
      el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, presetSel, loadBtn)
    )
  )
}

// ─── Dice Mechanics ──────────────────────────────────────────────────────────
const DICE_MECHANICS = ['pool-count','pool-sum','single-die','step-die','roll-under','roll-over','roll-plus-mod','advantage-disadvantage','target-number','drama-die','custom']
const DICE_LABELS = { 'pool-count':'Pool Count','pool-sum':'Pool Sum','single-die':'Single Die','step-die':'Step Die','roll-under':'Roll Under','roll-over':'Roll Over','roll-plus-mod':'Roll + Modifier','advantage-disadvantage':'Advantage / Disadvantage','target-number':'Target Number','drama-die':'Drama Die','custom':'Custom' }

function renderDiceEngine(engine, onDelete, container) {
  const card = el('div', { class: 'card', style: { marginBottom: '12px' } })

  function rebuild() {
    card.innerHTML = ''

    const mechSel = el('select')
    DICE_MECHANICS.forEach(m => {
      const o = el('option', { value: m }, DICE_LABELS[m])
      if (m === engine.mechanic) o.selected = true
      mechSel.append(o)
    })
    mechSel.onchange = () => { engine.mechanic = mechSel.value; window.markDirty(); rebuild() }

    card.append(
      el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px', gap: '8px' } },
        el('div', { class: 'field-row-inline', style: { flex: 1 } },
          el('div', { class: 'field-row' }, el('label', 'ID'), txtI(engine.id, v => { engine.id = v; window.markDirty() }, 'default')),
          el('div', { class: 'field-row' }, el('label', 'Name'), txtI(engine.name, v => { engine.name = v; window.markDirty() }, 'Default Roll'))
        ),
        el('button', { class: 'btn btn-danger btn-sm', onclick: onDelete }, 'Remove')
      ),
      el('div', { class: 'field-row' }, el('label', 'Mechanic'), mechSel)
    )

    const mech = engine.mechanic
    if (mech === 'roll-under') {
      card.append(el('div', { class: 'field-row-inline' },
        el('div', { class: 'field-row' }, el('label', 'Die Sides'), numI(engine.sides, v => { engine.sides = v; window.markDirty() }, 2)),
        el('div', { class: 'field-row' }, el('label', 'Target Formula'), txtI(engine.targetFormula, v => { engine.targetFormula = v; window.markDirty() }, '@attr + 10'))
      ))
      card.append(el('p', { style: { fontSize: '12px', color: '#888', margin: '4px 0' } }, 'Roll strictly below the target formula to succeed.'))
    } else if (mech === 'roll-over') {
      card.append(el('div', { class: 'field-row-inline' },
        el('div', { class: 'field-row' }, el('label', 'Die Sides'), numI(engine.sides, v => { engine.sides = v; window.markDirty() }, 2)),
        el('div', { class: 'field-row' }, el('label', 'Target Formula'), txtI(engine.targetFormula, v => { engine.targetFormula = v; window.markDirty() }, '@attr'))
      ))
      card.append(el('p', { style: { fontSize: '12px', color: '#888', margin: '4px 0' } }, 'Roll equal to or above the target formula to succeed.'))
    } else if (mech === 'roll-plus-mod') {
      card.append(el('div', { class: 'field-row-inline' },
        el('div', { class: 'field-row' }, el('label', 'Die Sides'), numI(engine.sides, v => { engine.sides = v; window.markDirty() }, 2)),
        el('div', { class: 'field-row' }, el('label', 'Modifier Formula'), txtI(engine.modFormula, v => { engine.modFormula = v; window.markDirty() }, '@attr'))
      ))
      card.append(el('p', { style: { fontSize: '12px', color: '#888', margin: '4px 0' } }, 'Roll the die, add the modifier formula, compare to a difficulty set at roll time.'))
    } else if (!['custom','drama-die'].includes(mech)) {
      const showThreshold = !['single-die','step-die'].includes(mech)
      card.append(el('div', { class: 'field-row-inline' },
        el('div', { class: 'field-row' }, el('label', 'Die Sides'), numI(engine.sides, v => { engine.sides = v; window.markDirty() }, 2)),
        showThreshold
          ? el('div', { class: 'field-row' }, el('label', 'Success Threshold'), numI(engine.threshold, v => { engine.threshold = v; window.markDirty() }, 1))
          : el('span')
      ))
    }

    if (['pool-count','pool-sum'].includes(mech)) {
      const cb = el('input', { type: 'checkbox' }); cb.checked = !!engine.explodes
      cb.onchange = () => { engine.explodes = cb.checked; window.markDirty() }
      card.append(el('div', { class: 'checkbox-row' }, cb, el('label', 'Dice explode on maximum roll')))
    }

    if (mech === 'advantage-disadvantage') {
      const kmSel = el('select')
      ;['highest','lowest'].forEach(v => {
        const o = el('option', { value: v }, v === 'highest' ? 'Keep Highest' : 'Keep Lowest')
        if (v === engine.keepMode) o.selected = true
        kmSel.append(o)
      })
      kmSel.onchange = () => { engine.keepMode = kmSel.value; window.markDirty() }
      card.append(el('div', { class: 'field-row' }, el('label', 'Keep Mode'), kmSel))
    }

    if (!engine.degrees) engine.degrees = []
    const degreesWrap = el('div')
    function rebuildDegrees() {
      degreesWrap.innerHTML = ''
      engine.degrees.forEach((d, di) => {
        degreesWrap.append(el('div', { class: 'list-row' },
          el('div', { class: 'list-row-body' },
            el('div', { class: 'field-row-inline' },
              el('div', { class: 'field-row' }, el('label', 'ID'), txtI(d.id, v => { d.id = v; window.markDirty() })),
              el('div', { class: 'field-row' }, el('label', 'Label'), txtI(d.label, v => { d.label = v; window.markDirty() })),
              el('div', { class: 'field-row' }, el('label', 'Min Value'), numI(d.min, v => { d.min = v; window.markDirty() }, 0))
            )
          ),
          el('div', { class: 'list-row-actions' },
            el('button', { class: 'btn btn-danger btn-sm', onclick: () => { engine.degrees.splice(di, 1); window.markDirty(); rebuildDegrees() } }, '×')
          )
        ))
      })
      degreesWrap.append(el('button', { class: 'btn btn-secondary btn-sm', onclick: () => {
        engine.degrees.push({ id: '', label: '', min: 0 }); window.markDirty(); rebuildDegrees()
      }}, '+ Add Degree'))
    }
    rebuildDegrees()

    card.append(
      el('h4', { style: { margin: '14px 0 6px', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase' } }, 'Degrees of Success'),
      degreesWrap,
      el('div', { class: 'field-row', style: { marginTop: '12px' } }, el('label', 'Description'),
        taI(engine.description, v => { engine.description = v; window.markDirty() }, 'Describe this dice mechanic for players…')
      )
    )
  }

  rebuild()
  container.append(card)
}

window.renderDiceSection = function(container) {
  const wrap = el('div')
  function rebuild() {
    wrap.innerHTML = ''
    window.state.dice.forEach((engine, i) => {
      renderDiceEngine(engine, () => { window.state.dice.splice(i, 1); window.markDirty(); rebuild() }, wrap)
    })
  }
  rebuild()
  container.append(
    el('h2', { class: 'section-title' }, 'Dice Mechanics'),
    el('p', { style: { color: '#666', marginBottom: '16px' } }, 'Define one or more dice engines. Most systems have one; some (e.g. Shadowrun Edge) have multiple.'),
    wrap,
    el('button', { class: 'btn btn-secondary', onclick: () => {
      window.state.dice.push({ id: '', name: '', mechanic: 'pool-count', sides: 6, threshold: 5, comparison: 'gte', explodes: false, keepMode: null, degrees: [], description: '' })
      window.markDirty(); rebuild()
    }}, '+ Add Dice Engine')
  )
}

// ─── Attributes ───────────────────────────────────────────────────────────────
window.renderAttributesSection = function(container) {
  const attrs = window.state.attributes
  const wrap = el('div')

  function rebuild() {
    wrap.innerHTML = ''
    attrs.forEach((a, i) => {
      const rowWrap = el('div', { class: 'list-row' })
      const body = el('div', { class: 'list-row-body' })

      function rebuildBody() {
        body.innerHTML = ''
        const typeSel = el('select')
        ;['integer','rating','derived'].forEach(t => {
          const o = el('option', { value: t }, t); if (t === a.type) o.selected = true; typeSel.append(o)
        })
        typeSel.onchange = () => { a.type = typeSel.value; window.markDirty(); rebuildBody() }

        const rangeOrFormula = a.type === 'derived'
          ? el('div', { class: 'field-row' }, el('label', 'Formula'), txtI(a.formula, v => { a.formula = v; window.markDirty() }, '@str + @con'))
          : el('div', { class: 'field-row-inline' },
              el('div', { class: 'field-row' }, el('label', 'Min'), numI(a.min, v => { a.min = v; window.markDirty() })),
              el('div', { class: 'field-row' }, el('label', 'Max'), numI(a.max, v => { a.max = v; window.markDirty() })),
              el('div', { class: 'field-row' }, el('label', 'Default'), numI(a.default, v => { a.default = v; window.markDirty() }))
            )

        body.append(
          el('div', { class: 'field-row-inline' },
            el('div', { class: 'field-row' }, el('label', 'ID'), txtI(a.id, v => { a.id = v; window.markDirty() }, 'str')),
            el('div', { class: 'field-row' }, el('label', 'Label'), txtI(a.label, v => { a.label = v; window.markDirty() }, 'Strength')),
            el('div', { class: 'field-row' }, el('label', 'Type'), typeSel)
          ),
          rangeOrFormula,
          el('div', { class: 'field-row' }, el('label', 'Description'),
            taI(a.description, v => { a.description = v; window.markDirty() }, 'Describe this attribute…')
          )
        )
      }
      rebuildBody()
      rowWrap.append(body, el('div', { class: 'list-row-actions' },
        el('button', { class: 'btn btn-danger btn-sm', onclick: () => { attrs.splice(i, 1); window.markDirty(); rebuild() } }, '×')
      ))
      wrap.append(rowWrap)
    })
    wrap.append(el('button', { class: 'btn btn-secondary', onclick: () => {
      attrs.push({ id: '', label: '', type: 'integer', min: 1, max: 10, default: 1, formula: '', description: '' })
      window.markDirty(); rebuild()
    }}, '+ Add Attribute'))
  }

  rebuild()
  container.append(el('h2', { class: 'section-title' }, 'Attributes'), wrap)
}

// ─── Skills ───────────────────────────────────────────────────────────────────
window.renderSkillsSection = function(container) {
  const skills = window.state.skills
  const wrap = el('div')

  function rebuild() {
    wrap.innerHTML = ''
    skills.forEach((s, i) => {
      const attrList = (window.state.attributes || []).map(a => ({ id: a.id, label: a.label || a.id }))
      const cbGroup = el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' } })
      attrList.forEach(a => {
        const cb = el('input', { type: 'checkbox' }); cb.checked = (s.linkedAttributes || []).includes(a.id)
        cb.onchange = () => {
          if (!s.linkedAttributes) s.linkedAttributes = []
          if (cb.checked) { if (!s.linkedAttributes.includes(a.id)) s.linkedAttributes.push(a.id) }
          else s.linkedAttributes = s.linkedAttributes.filter(x => x !== a.id)
          window.markDirty()
        }
        cbGroup.append(el('label', { style: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' } }, cb, a.label))
      })
      wrap.append(el('div', { class: 'list-row' },
        el('div', { class: 'list-row-body' },
          el('div', { class: 'field-row-inline' },
            el('div', { class: 'field-row' }, el('label', 'ID'), txtI(s.id, v => { s.id = v; window.markDirty() }, 'athletics')),
            el('div', { class: 'field-row' }, el('label', 'Label'), txtI(s.label, v => { s.label = v; window.markDirty() }, 'Athletics'))
          ),
          el('div', { class: 'field-row' }, el('label', 'Linked Attributes'), cbGroup),
          el('div', { class: 'field-row' }, el('label', 'Description'),
            taI(s.description, v => { s.description = v; window.markDirty() }, 'Describe this skill…')
          )
        ),
        el('div', { class: 'list-row-actions' },
          el('button', { class: 'btn btn-danger btn-sm', onclick: () => { skills.splice(i, 1); window.markDirty(); rebuild() } }, '×')
        )
      ))
    })
    wrap.append(el('button', { class: 'btn btn-secondary', onclick: () => {
      skills.push({ id: '', label: '', linkedAttributes: [], description: '' }); window.markDirty(); rebuild()
    }}, '+ Add Skill'))
  }

  rebuild()
  container.append(el('h2', { class: 'section-title' }, 'Skills'), wrap)
}

// ─── Derived Stats ────────────────────────────────────────────────────────────
window.renderDerivedSection = function(container) {
  const derived = window.state.derived
  const wrap = el('div')

  function rebuild() {
    wrap.innerHTML = ''
    derived.forEach((d, i) => {
      wrap.append(el('div', { class: 'list-row' },
        el('div', { class: 'list-row-body' },
          el('div', { class: 'field-row-inline' },
            el('div', { class: 'field-row' }, el('label', 'ID'), txtI(d.id, v => { d.id = v; window.markDirty() }, 'initiative')),
            el('div', { class: 'field-row' }, el('label', 'Label'), txtI(d.label, v => { d.label = v; window.markDirty() }, 'Initiative')),
            el('div', { class: 'field-row' }, el('label', 'Formula'), txtI(d.formula, v => { d.formula = v; window.markDirty() }, '@reaction + @intuition'))
          ),
          el('div', { class: 'field-row' }, el('label', 'Description'),
            taI(d.description, v => { d.description = v; window.markDirty() })
          )
        ),
        el('div', { class: 'list-row-actions' },
          el('button', { class: 'btn btn-danger btn-sm', onclick: () => { derived.splice(i, 1); window.markDirty(); rebuild() } }, '×')
        )
      ))
    })
    wrap.append(el('button', { class: 'btn btn-secondary', onclick: () => {
      derived.push({ id: '', label: '', formula: '', description: '' }); window.markDirty(); rebuild()
    }}, '+ Add Derived Stat'))
  }

  rebuild()
  container.append(
    el('h2', { class: 'section-title' }, 'Derived Stats'),
    el('p', { style: { color: '#666', marginBottom: '16px' } }, 'Values computed from attributes (e.g. Initiative, Wound Threshold).'),
    wrap
  )
}

// ─── Resources ────────────────────────────────────────────────────────────────
window.renderResourcesSection = function(container) {
  const resources = window.state.resources
  const wrap = el('div')

  function rebuild() {
    wrap.innerHTML = ''
    resources.forEach((r, i) => {
      const recCb = el('input', { type: 'checkbox' }); recCb.checked = r.recoverable !== false
      recCb.onchange = () => { r.recoverable = recCb.checked; window.markDirty() }
      wrap.append(el('div', { class: 'list-row' },
        el('div', { class: 'list-row-body' },
          el('div', { class: 'field-row-inline' },
            el('div', { class: 'field-row' }, el('label', 'ID'), txtI(r.id, v => { r.id = v; window.markDirty() }, 'hp')),
            el('div', { class: 'field-row' }, el('label', 'Label'), txtI(r.label, v => { r.label = v; window.markDirty() }, 'Hit Points')),
            el('div', { class: 'field-row' }, el('label', 'Max Formula'), txtI(r.formula, v => { r.formula = v; window.markDirty() }, '@con * 3'))
          ),
          el('div', { class: 'checkbox-row' }, recCb, el('label', 'Recoverable (can be restored)')),
          el('div', { class: 'field-row' }, el('label', 'Description'),
            taI(r.description, v => { r.description = v; window.markDirty() })
          )
        ),
        el('div', { class: 'list-row-actions' },
          el('button', { class: 'btn btn-danger btn-sm', onclick: () => { resources.splice(i, 1); window.markDirty(); rebuild() } }, '×')
        )
      ))
    })
    wrap.append(el('button', { class: 'btn btn-secondary', onclick: () => {
      resources.push({ id: '', label: '', formula: '', recoverable: true, description: '' }); window.markDirty(); rebuild()
    }}, '+ Add Resource'))
  }

  rebuild()
  container.append(
    el('h2', { class: 'section-title' }, 'Resources'),
    el('p', { style: { color: '#666', marginBottom: '16px' } }, 'Tracked pools like Hit Points, Magic Points, Edge, or Stress.'),
    wrap
  )
}
