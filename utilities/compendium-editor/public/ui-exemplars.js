const EX_KINDS = ['species','archetype','discipline','vocation','item','background','origin','feature','rule','sequence','action']
const GRANT_KINDS_WITH_GRANTS = ['species','archetype','discipline','vocation','item','background','origin','feature']

let _selIdx = -1
let _filterKind = 'all'
let _search = ''

function exTxtInput(val, onch, ph) {
  const i = el('input', { type: 'text', value: val || '', placeholder: ph || '' })
  i.oninput = () => onch(i.value)
  return i
}
function exNumInput(val, onch) {
  const i = el('input', { type: 'number', value: val ?? '' })
  i.oninput = () => { i.value !== '' ? onch(Number(i.value)) : onch(null) }
  return i
}
function exTa(val, onch, ph) {
  const ta = el('textarea', { placeholder: ph || '' }, val || '')
  ta.oninput = () => onch(ta.value)
  return ta
}

// ─── Grant editor ─────────────────────────────────────────────────────────────
function renderGrantRow(grant, onDelete, onChange) {
  const wrap = el('div', { class: 'grant-row' })
  const body = el('div', { class: 'grant-row-body' })

  const typeSel = el('select', { style: { width: 'auto', flex: '0 0 auto' } })
  ;['modifier','reference','choice','rule-modifier'].forEach(t => {
    const o = el('option', { value: t }, t); if (t === grant.type) o.selected = true; typeSel.append(o)
  })
  typeSel.onchange = () => { grant.type = typeSel.value; onChange(); rebuildBody() }

  function rebuildBody() {
    body.innerHTML = ''
    body.append(el('div', { class: 'field-row', style:{minWidth:'120px',marginBottom:0} }, el('label','Type'), typeSel))
    switch (grant.type) {
      case 'modifier':
        body.append(
          el('div', { class: 'field-row', style:{flex:1,marginBottom:0} }, el('label','Path'), exTxtInput(grant.path, v=>{grant.path=v;onChange()}, 'system.body')),
          el('div', { class: 'field-row', style:{flex:'0 0 100px',marginBottom:0} }, el('label','Value'), exTxtInput(String(grant.value??''), v=>{const n=Number(v);grant.value=isNaN(n)?v:n;onChange()}, '1'))
        )
        break
      case 'reference':
        body.append(el('div', { class: 'field-row', style:{flex:1,marginBottom:0} }, el('label','Exemplar ID'), exTxtInput(grant.exemplarId, v=>{grant.exemplarId=v;onChange()})))
        break
      case 'choice': {
        if (!grant.from) grant.from = []
        const fromWrap = el('div', { class: 'grant-sub' })
        function rebuildFrom() {
          fromWrap.innerHTML = ''
          grant.from.forEach((sub, si) => {
            const subTypeSel = el('select', { style:{width:'auto'} })
            ;['modifier','reference'].forEach(t => { const o=el('option',{value:t},t);if(t===sub.type)o.selected=true;subTypeSel.append(o) })
            subTypeSel.onchange = () => { sub.type = subTypeSel.value; onChange(); rebuildFrom() }
            const subBody = el('div', { style:{display:'flex',gap:'6px',flexWrap:'wrap',flex:1} })
            if (sub.type === 'modifier') {
              subBody.append(
                el('div',{class:'field-row',style:{flex:1,marginBottom:0}},el('label','Path'),exTxtInput(sub.path,v=>{sub.path=v;onChange()},'system.body')),
                el('div',{class:'field-row',style:{flex:'0 0 80px',marginBottom:0}},el('label','Value'),exTxtInput(String(sub.value??''),v=>{const n=Number(v);sub.value=isNaN(n)?v:n;onChange()},'1'))
              )
            } else {
              subBody.append(el('div',{class:'field-row',style:{flex:1,marginBottom:0}},el('label','Exemplar ID'),exTxtInput(sub.exemplarId,v=>{sub.exemplarId=v;onChange()})))
            }
            fromWrap.append(el('div',{style:{display:'flex',gap:'6px',alignItems:'flex-start',marginBottom:'4px'}},
              el('div',{class:'field-row',style:{flex:'0 0 100px',marginBottom:0}},el('label','Type'),subTypeSel),
              subBody,
              el('button',{class:'btn btn-danger btn-sm',style:{marginTop:'18px'},onclick:()=>{grant.from.splice(si,1);onChange();rebuildFrom()}},'×')
            ))
          })
          fromWrap.append(el('button',{class:'btn btn-secondary btn-sm',onclick:()=>{grant.from.push({type:'modifier',path:'',value:0});onChange();rebuildFrom()}},'+ Add'))
        }
        rebuildFrom()
        body.append(
          el('div',{class:'field-row',style:{flex:'0 0 150px',marginBottom:0}},el('label','Choice Label'),exTxtInput(grant.label,v=>{grant.label=v;onChange()})),
          el('div',{class:'field-row',style:{flex:'0 0 80px',marginBottom:0}},el('label','Choose'),exNumInput(grant.choose,v=>{grant.choose=v;onChange()})),
          el('div',{style:{width:'100%'}},el('label',{style:{fontSize:'12px',color:'#666',fontWeight:'600'}},'FROM:'),fromWrap)
        )
        break
      }
      case 'rule-modifier': {
        const overTa = exTa(grant.overrides ? JSON.stringify(grant.overrides,null,2) : '', v => { try { grant.overrides=JSON.parse(v) } catch{} onChange() }, '{ "pool": "@body + 2" }')
        overTa.style.minHeight = '60px'; overTa.style.fontFamily = 'monospace'; overTa.style.fontSize = '12px'
        body.append(
          el('div',{class:'field-row',style:{flex:1,marginBottom:0}},el('label','Rule ID'),exTxtInput(grant.ruleId,v=>{grant.ruleId=v;onChange()})),
          el('div',{class:'field-row',style:{width:'100%',marginBottom:0}},el('label','Overrides (JSON)'),overTa)
        )
        break
      }
    }
  }
  rebuildBody()
  const delBtn = el('button',{class:'btn btn-danger btn-sm',style:{flexShrink:'0',marginTop:'2px'},onclick:onDelete},'×')
  wrap.append(body, delBtn)
  return wrap
}

// ─── Exemplar edit panel ──────────────────────────────────────────────────────
function renderExemplarEdit(exemplar, editPanel, onRerender) {
  editPanel.innerHTML = ''
  if (!exemplar) { editPanel.append(el('div',{class:'exemplar-empty'},'Select an exemplar to edit or create a new one')); return }

  const kindSel = el('select')
  EX_KINDS.forEach(k => { const o=el('option',{value:k},k);if(k===exemplar.kind)o.selected=true;kindSel.append(o) })
  kindSel.onchange = () => { exemplar.kind=kindSel.value; window.markDirty(); onRerender() }

  const idInp = exTxtInput(exemplar.id, v=>{exemplar.id=v;window.markDirty();onRerender()})
  const verInp = exTxtInput(exemplar.version, v=>{exemplar.version=v;window.markDirty()}, '0.1.0')
  const nameInp = exTxtInput(exemplar.name, v=>{exemplar.name=v;window.markDirty();onRerender()})
  const descTa = exTa(exemplar.description, v=>{exemplar.description=v;window.markDirty()}, 'Describe this entry for players…')
  const tagsInp = exTxtInput((exemplar.tags||[]).join(', '), v=>{exemplar.tags=v.split(',').map(s=>s.trim()).filter(Boolean);window.markDirty()}, 'core, humanoid')

  editPanel.append(
    el('div',{class:'field-row-inline'},
      el('div',{class:'field-row'},el('label','Kind'),kindSel),
      el('div',{class:'field-row'},el('label','ID'),idInp),
      el('div',{class:'field-row'},el('label','Version'),verInp)
    ),
    el('div',{class:'field-row'},el('label','Name'),nameInp),
    el('div',{class:'field-row'},el('label','Description (player-facing)'),descTa),
    el('div',{class:'field-row'},el('label','Tags (comma-separated)'),tagsInp)
  )

  if (['discipline','vocation'].includes(exemplar.kind)) {
    editPanel.append(el('div',{class:'field-row'},el('label','Parent (archetype/discipline ID)'),exTxtInput(exemplar.parent,v=>{exemplar.parent=v;window.markDirty()})))
  }

  // ── Grants ────────────────────────────────────────────────────────────────
  if (GRANT_KINDS_WITH_GRANTS.includes(exemplar.kind)) {
    if (!exemplar.grants) exemplar.grants = []
    const grantsWrap = el('div')
    function rebuildGrants() {
      grantsWrap.innerHTML = ''
      exemplar.grants.forEach((g,gi) => {
        grantsWrap.append(renderGrantRow(g, ()=>{exemplar.grants.splice(gi,1);window.markDirty();rebuildGrants()}, ()=>{window.markDirty()}))
      })
      grantsWrap.append(el('button',{class:'btn btn-secondary btn-sm',onclick:()=>{
        exemplar.grants.push({type:'modifier',path:'',value:0});window.markDirty();rebuildGrants()
      }},'+ Add Grant'))
    }
    rebuildGrants()
    editPanel.append(el('h4',{style:{margin:'16px 0 8px'}},'Grants'), grantsWrap)
  }

  // ── Rule extras ───────────────────────────────────────────────────────────
  if (exemplar.kind === 'rule') {
    if (!exemplar.on_tier) exemplar.on_tier = {}
    if (!exemplar.chains) exemplar.chains = {}
    const onTierWrap = el('div')
    const onTierEntries = Object.entries(exemplar.on_tier)
    function rebuildOnTier() {
      onTierWrap.innerHTML = ''
      Object.entries(exemplar.on_tier).forEach(([tier]) => {
        const cons = exemplar.on_tier[tier]
        const del = el('button',{class:'btn btn-danger btn-sm',onclick:()=>{delete exemplar.on_tier[tier];window.markDirty();rebuildOnTier()}},'×')
        onTierWrap.append(el('div',{class:'list-row'},
          el('div',{class:'list-row-body'},
            el('div',{class:'field-row-inline'},
              el('div',{class:'field-row'},el('label','Tier Name'),exTxtInput(tier,v=>{if(v!==tier){exemplar.on_tier[v]=cons;delete exemplar.on_tier[tier];window.markDirty();rebuildOnTier()}},'')),
              el('div',{class:'field-row'},el('label','Damage'),exTxtInput(cons.damage,v=>{cons.damage=v;window.markDirty()},'')),
              el('div',{class:'field-row'},el('label','Effect'),exTxtInput(cons.effect,v=>{cons.effect=v;window.markDirty()},'')),
              el('div',{class:'field-row'},el('label','Message'),exTxtInput(cons.chat,v=>{cons.chat=v;window.markDirty()},''))
            )
          ), el('div',{class:'list-row-actions'},del)
        ))
      })
      onTierWrap.append(el('button',{class:'btn btn-secondary btn-sm',onclick:()=>{exemplar.on_tier['new-tier']={};window.markDirty();rebuildOnTier()}},'+ Add Tier Consequence'))
    }
    rebuildOnTier()
    editPanel.append(
      el('h4',{style:{margin:'16px 0 8px'}},'Rule Configuration'),
      el('div',{class:'field-row-inline'},
        el('div',{class:'field-row'},el('label','Ritus ID'),exTxtInput(exemplar.ritus,v=>{exemplar.ritus=v;window.markDirty()})),
        el('div',{class:'field-row'},el('label','Pool Expression'),exTxtInput(exemplar.pool,v=>{exemplar.pool=v;window.markDirty()},'@initiator.system.skills.firearms + @initiator.system.agility'))
      ),
      el('div',{class:'field-row'},el('label','On-Tier Consequences'), onTierWrap)
    )
  }

  // ── Sequence extras ───────────────────────────────────────────────────────
  if (exemplar.kind === 'sequence') {
    if (!exemplar.steps) exemplar.steps = []
    const stepsWrap = el('div')
    function rebuildSeqSteps() {
      stepsWrap.innerHTML = ''
      exemplar.steps.forEach((step,si) => {
        const hasAwait = !!step.await
        const awCb = el('input',{type:'checkbox'}); awCb.checked = hasAwait
        const awExtras = el('div',{style:{display:hasAwait?'block':'none'}})
        awCb.onchange = () => {
          if (awCb.checked) { step.await={type:'player-decision',choices:[]}; } else { delete step.await; }
          awExtras.style.display = awCb.checked ? 'block' : 'none'
          window.markDirty()
        }
        if (hasAwait) {
          awExtras.append(
            el('div',{class:'field-row'},el('label','Choices (comma-separated)'),exTxtInput((step.await.choices||[]).join(','),v=>{step.await.choices=v.split(',').map(s=>s.trim());window.markDirty()},'roll-defense'))
          )
        }
        const typeRuleRb = el('input',{type:'radio',name:`step-type-${si}`}); typeRuleRb.checked = !!step.rule
        const typeSeqRb  = el('input',{type:'radio',name:`step-type-${si}`}); typeSeqRb.checked  = !!step.sequence
        const refInp = exTxtInput(step.rule||step.sequence||'', v=>{
          if (typeRuleRb.checked) { step.rule=v; delete step.sequence } else { step.sequence=v; delete step.rule }
          window.markDirty()
        })
        typeRuleRb.onchange = typeSeqRb.onchange = () => window.markDirty()
        const actorSel = el('select')
        ;['','initiator','target','gm','all'].forEach(a=>{const o=el('option',{value:a},a||'(default)');if(a===step.actor)o.selected=true;actorSel.append(o)})
        actorSel.onchange = () => { step.actor = actorSel.value || undefined; window.markDirty() }
        stepsWrap.append(el('div',{class:'list-row'},
          el('div',{class:'list-row-body'},
            el('div',{class:'field-row-inline'},
              el('div',{class:'field-row'},el('label','Step ID'),exTxtInput(step.id,v=>{step.id=v;window.markDirty()})),
              el('div',{class:'field-row'},el('label','Actor'),actorSel)
            ),
            el('div',{style:{display:'flex',gap:'12px',alignItems:'center',marginBottom:'6px'}},
              el('label',{style:{display:'flex',gap:'4px',alignItems:'center'}},typeRuleRb,'Rule ref'),
              el('label',{style:{display:'flex',gap:'4px',alignItems:'center'}},typeSeqRb,'Sequence ref'),
              refInp
            ),
            el('div',{class:'field-row'},el('label','Condition'),exTxtInput(step.condition,v=>{step.condition=v||undefined;window.markDirty()},'@steps.attack.tier != "miss"')),
            el('div',{class:'checkbox-row'},awCb,el('label','Has await')),
            awExtras
          ),
          el('div',{class:'list-row-actions'},
            el('button',{class:'btn btn-danger btn-sm',onclick:()=>{exemplar.steps.splice(si,1);window.markDirty();rebuildSeqSteps()}},'×')
          )
        ))
      })
      stepsWrap.append(el('button',{class:'btn btn-secondary btn-sm',onclick:()=>{exemplar.steps.push({id:'',rule:''});window.markDirty();rebuildSeqSteps()}},'+ Add Step'))
    }
    rebuildSeqSteps()
    editPanel.append(el('h4',{style:{margin:'16px 0 8px'}},'Sequence Steps'), stepsWrap)
  }

  // ── Action extras ─────────────────────────────────────────────────────────
  if (exemplar.kind === 'action') {
    if (!exemplar.targeting) exemplar.targeting = { mode: 'self' }
    const modeSel = el('select')
    ;['self','none','token','area'].forEach(m=>{const o=el('option',{value:m},m);if(m===exemplar.targeting.mode)o.selected=true;modeSel.append(o)})
    const targetExtras = el('div')
    function rebuildTargetExtras() {
      targetExtras.innerHTML = ''
      if (exemplar.targeting.mode === 'token') {
        targetExtras.append(
          el('div',{class:'field-row-inline'},
            el('div',{class:'field-row'},el('label','Min targets'),exNumInput(exemplar.targeting.min,v=>{exemplar.targeting.min=v;window.markDirty()})),
            el('div',{class:'field-row'},el('label','Max targets (blank=∞)'),exNumInput(exemplar.targeting.max,v=>{exemplar.targeting.max=v;window.markDirty()}))
          )
        )
      } else if (exemplar.targeting.mode === 'area') {
        const shapeSel = el('select')
        ;['circle','cone','line','ray'].forEach(s=>{const o=el('option',{value:s},s);if(s===exemplar.targeting.shape)o.selected=true;shapeSel.append(o)})
        shapeSel.onchange = () => { exemplar.targeting.shape=shapeSel.value; window.markDirty() }
        targetExtras.append(
          el('div',{class:'field-row'},el('label','Shape'),shapeSel),
          el('div',{class:'field-row-inline'},
            el('div',{class:'field-row'},el('label','Size'),exNumInput(exemplar.targeting.size,v=>{exemplar.targeting.size=v;window.markDirty()})),
            el('div',{class:'field-row'},el('label','Width (optional)'),exNumInput(exemplar.targeting.width,v=>{exemplar.targeting.width=v;window.markDirty()}))
          )
        )
      }
    }
    modeSel.onchange = () => { exemplar.targeting.mode=modeSel.value; window.markDirty(); rebuildTargetExtras() }
    rebuildTargetExtras()
    if (!exemplar.cost) exemplar.cost = {}
    editPanel.append(
      el('h4',{style:{margin:'16px 0 8px'}},'Action Configuration'),
      el('div',{class:'field-row'},el('label','Sequence ref'),exTxtInput(exemplar.sequence,v=>{exemplar.sequence=v;window.markDirty()})),
      el('div',{class:'field-row-inline'},
        el('div',{class:'field-row'},el('label','Hint'),exTxtInput(exemplar.hint,v=>{exemplar.hint=v;window.markDirty()})),
        el('div',{class:'field-row'},el('label','Icon'),exTxtInput(exemplar.icon,v=>{exemplar.icon=v;window.markDirty()}))
      ),
      el('div',{class:'field-row'},el('label','Targeting Mode'),modeSel),
      targetExtras,
      el('h4',{style:{margin:'12px 0 6px'}},'Action Cost'),
      el('div',{class:'field-row-inline'},
        el('div',{class:'field-row'},el('label','Action Points'),exNumInput(exemplar.cost.actionPoints,v=>{exemplar.cost.actionPoints=v;window.markDirty()})),
        el('div',{class:'field-row'},el('label','Bonus Actions'),exNumInput(exemplar.cost.bonusActions,v=>{exemplar.cost.bonusActions=v;window.markDirty()})),
        el('div',{class:'field-row'},el('label','Reactions'),exNumInput(exemplar.cost.reactions,v=>{exemplar.cost.reactions=v;window.markDirty()}))
      )
    )
  }

  editPanel.append(
    el('div',{style:{marginTop:'24px',borderTop:'1px solid #eee',paddingTop:'16px'}},
      el('button',{class:'btn btn-danger',onclick:()=>{
        const idx = window.state.exemplars.indexOf(exemplar)
        if (idx >= 0) { window.state.exemplars.splice(idx,1); _selIdx=-1; window.markDirty(); onRerender() }
      }},'Delete Exemplar')
    )
  )
}

// ─── Exemplar section ─────────────────────────────────────────────────────────
window.renderExemplarsSection = function(container) {
  container.innerHTML = ''
  const layout = el('div',{class:'exemplar-layout'})
  const listPanel  = el('div',{class:'exemplar-list-panel'})
  const editPanel  = el('div',{class:'exemplar-edit-panel'})

  const kindSel = el('select')
  ;['all',...EX_KINDS].forEach(k=>{const o=el('option',{value:k},k==='all'?'All Kinds':k);if(k===_filterKind)o.selected=true;kindSel.append(o)})
  kindSel.onchange = () => { _filterKind=kindSel.value; rebuildList() }

  const searchInp = el('input',{type:'text',placeholder:'Search…',value:_search})
  searchInp.oninput = () => { _search=searchInp.value; rebuildList() }

  const listScroll = el('div',{class:'exemplar-list-scroll'})

  function rebuildList() {
    listScroll.innerHTML = ''
    const exs = window.state.exemplars
    const q = _search.toLowerCase()
    exs.forEach((ex,i) => {
      if (_filterKind !== 'all' && ex.kind !== _filterKind) return
      if (q && !(ex.name||'').toLowerCase().includes(q) && !(ex.id||'').toLowerCase().includes(q)) return
      const item = el('div',{class:'exemplar-list-item'+(i===_selIdx?' active':'')},
        el('div',{class:'exemplar-list-item-name'},
          ex.name||'(unnamed)',
          el('span',{class:`kind-badge kind-${ex.kind}`},ex.kind)
        ),
        el('div',{class:'exemplar-list-item-desc'},(ex.description||'').slice(0,60)||'No description')
      )
      item.onclick = () => { _selIdx=i; rebuildList(); renderExemplarEdit(window.state.exemplars[i], editPanel, ()=>{rebuildList(); renderExemplarEdit(window.state.exemplars[_selIdx],editPanel,()=>{rebuildList()})}) }
      listScroll.append(item)
    })
  }

  const footer = el('div',{class:'exemplar-list-footer'},
    el('button',{class:'btn btn-primary',style:{width:'100%'},onclick:()=>{
      const newEx = {kind:'species',id:'',version:'0.1.0',name:'',description:'',tags:[],grants:[]}
      window.state.exemplars.push(newEx)
      _selIdx = window.state.exemplars.length-1
      window.markDirty(); rebuildList()
      renderExemplarEdit(newEx, editPanel, ()=>{rebuildList(); renderExemplarEdit(window.state.exemplars[_selIdx],editPanel,()=>rebuildList())})
    }},'+ New Exemplar')
  )

  listPanel.append(
    el('div',{class:'exemplar-list-controls'}, kindSel, searchInp),
    listScroll, footer
  )

  rebuildList()
  const selected = _selIdx >= 0 ? window.state.exemplars[_selIdx] : null
  renderExemplarEdit(selected, editPanel, ()=>{
    rebuildList()
    if (_selIdx >= 0) renderExemplarEdit(window.state.exemplars[_selIdx], editPanel, ()=>rebuildList())
  })

  layout.append(listPanel, editPanel)
  container.append(el('h2',{class:'section-title'},'Compendium Content'), layout)
}
