import express from 'express'
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'
import { generateCompendiumHTML } from './lib/htmlGen.js'
import { scaffoldFiles } from './lib/scaffold.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3737
const DATA_FILE = join(__dirname, 'data', 'world.json')
const PRESETS_DIR = join(__dirname, 'data', 'presets')

app.use(express.json({ limit: '10mb' }))
app.use(express.static(join(__dirname, 'public')))

function defaultWorld() {
  return {
    meta: { systemId: '', name: '', description: '', version: '0.1.0' },
    plugin: { compatibility: { minimum: '12', verified: '14' } },
    dice: [],
    attributes: [],
    skills: [],
    derived: [],
    resources: [],
    currencies: [],
    contentTypes: [],
    creation: { id: '', mode: 'steps', steps: [], advancementTracks: [] },
    content: []
  }
}

function migrate(old) {
  if (!old.ritus && !old.codex) return old
  const world = defaultWorld()
  world.meta = {
    systemId: old.meta?.worldId || '',
    name: old.meta?.name || '',
    description: old.meta?.description || '',
    version: old.meta?.version || '0.1.0'
  }
  if (old.ritus) {
    const degrees = []
    if (old.ritus.tiers?.glancing != null) degrees.push({ id: 'glancing', label: 'Glancing', min: old.ritus.tiers.glancing })
    if (old.ritus.tiers?.hit != null) degrees.push({ id: 'hit', label: 'Hit', min: old.ritus.tiers.hit })
    if (old.ritus.tiers?.critical != null) degrees.push({ id: 'critical', label: 'Critical', min: old.ritus.tiers.critical })
    world.dice = [{
      id: old.ritus.id || 'default',
      name: old.ritus.name || 'Default Roll',
      mechanic: old.ritus.mechanic || 'pool-count',
      sides: old.ritus.sides ?? 6,
      threshold: old.ritus.threshold ?? 5,
      comparison: 'gte',
      explodes: old.ritus.explodes ?? false,
      keepMode: old.ritus.keepMode || null,
      degrees,
      description: old.ritus.description || ''
    }]
  }
  world.attributes = (old.codex?.attributes || []).map(a => ({
    id: a.slug, label: a.label, type: 'integer',
    min: a.min ?? 1, max: a.max ?? 10, default: a.default ?? 1,
    formula: '', description: a.description || ''
  }))
  world.skills = (old.codex?.skills || []).map(s => ({
    id: s.slug, label: s.label, linkedAttributes: s.linkedAttributes || [], description: s.description || ''
  }))
  world.derived = (old.codex?.derived || []).map(d => ({
    id: d.slug, label: d.label, formula: d.formula || '', description: d.description || ''
  }))
  world.currencies = old.codex?.currencies || []
  world.creation = {
    id: old.forma?.id || '',
    mode: 'steps',
    steps: old.forma?.creationSteps || [],
    advancementTracks: old.forma?.advancementTracks || []
  }
  const kinds = [...new Set((old.exemplars || []).map(e => e.kind).filter(Boolean))]
  world.contentTypes = kinds.map(k => ({
    id: k, label: k.charAt(0).toUpperCase() + k.slice(1), documentType: 'Item', fields: []
  }))
  world.content = (old.exemplars || []).map(e => ({
    id: e.id || '', kind: e.kind || '', version: e.version || '0.1.0',
    name: e.name || '', description: e.description || '', tags: e.tags || [], data: {}
  }))
  return world
}

function stripNulls(obj) {
  if (Array.isArray(obj)) return obj.map(stripNulls)
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => [k, stripNulls(v)])
    )
  }
  return obj
}

function buildExemplarYaml(entry) {
  return stripNulls({
    id: entry.id,
    version: entry.version || '0.1.0',
    kind: entry.kind,
    name: entry.name,
    description: entry.description,
    tags: entry.tags?.length ? entry.tags : undefined,
    ...entry.data
  })
}

function buildRitus(world) {
  const e = (world.dice || [])[0]
  if (!e) return null
  const degrees = e.degrees || []
  const byId = Object.fromEntries(degrees.map(d => [d.id, d.min]))
  let tiers
  if (byId.hit !== undefined) {
    tiers = { ...(byId.glancing != null ? { glancing: byId.glancing } : {}), hit: byId.hit, ...(byId.critical != null ? { critical: byId.critical } : {}) }
  } else if (degrees.length >= 2) {
    tiers = { hit: degrees[degrees.length - 2].min, critical: degrees[degrees.length - 1].min }
    if (degrees.length >= 3) tiers.glancing = degrees[0].min
  } else {
    tiers = { hit: e.threshold ?? 1 }
  }
  return stripNulls({ id: e.id || `${world.meta.systemId}-ritus`, name: e.name || `${world.meta.name} Dice System`, mechanic: e.mechanic || 'pool-count', sides: e.sides ?? 6, threshold: e.threshold ?? 1, explodes: e.explodes || undefined, keepMode: e.keepMode || undefined, tiers })
}

function buildCodex(world) {
  return {
    systemId: world.meta.systemId,
    attributes: (world.attributes || []).map(a => a.id),
    skills: (world.skills || []).map(s => s.id),
    derived: (world.derived || []).map(d => d.id),
    damageTypes: [],
    currencies: world.currencies || []
  }
}

function buildForma(world) {
  const c = world.creation || {}
  return stripNulls({
    id: c.id || `${world.meta.systemId}-forma`,
    systemId: world.meta.systemId,
    outputMapper: 'identity',
    creationSteps: (c.steps || []).map(step => ({
      ...step,
      fields: (step.fields || []).map(f =>
        f.type === 'content-grid' ? { ...f, type: 'exemplar-grid', kind: f.contentTypeId || f.kind || '', contentTypeId: undefined } : f
      )
    })),
    advancementTracks: c.advancementTracks?.length ? c.advancementTracks : undefined
  })
}

function buildModus(world) {
  const id = world.meta.systemId
  const ritus = buildRitus(world)

  const actors = { character: { label: 'Character', dataModel: {} } }
  const items = {}
  for (const ct of (world.contentTypes || [])) {
    if (ct.documentType === 'Actor') {
      actors[ct.id] = { label: ct.label || ct.id, dataModel: {} }
    } else if (!ct.documentType || ct.documentType === 'Item') {
      items[ct.id] = { label: ct.label || ct.id, dataModel: {} }
    }
  }

  return stripNulls({
    id,
    schemaVersion: 1,
    actors,
    ...(Object.keys(items).length ? { items } : {}),
    ritus: ritus?.id || undefined,
    codex: id || undefined,
    forma: world.creation?.id || `${id}-forma` || undefined
  })
}

app.get('/api/world', async (req, res) => {
  try {
    if (!existsSync(DATA_FILE)) return res.json(defaultWorld())
    const raw = await readFile(DATA_FILE, 'utf8')
    res.json(migrate(JSON.parse(raw)))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/world', async (req, res) => {
  try {
    await mkdir(join(__dirname, 'data'), { recursive: true })
    await writeFile(DATA_FILE, JSON.stringify(req.body, null, 2))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/preview', (req, res) => {
  try {
    const { world } = req.body
    res.json({ html: generateCompendiumHTML(world) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/presets', async (req, res) => {
  try {
    await mkdir(PRESETS_DIR, { recursive: true })
    const files = await readdir(PRESETS_DIR)
    res.json(files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/presets/:name', async (req, res) => {
  try {
    const file = join(PRESETS_DIR, `${req.params.name}.json`)
    if (!existsSync(file)) return res.status(404).json({ error: 'Preset not found' })
    res.json(JSON.parse(await readFile(file, 'utf8')))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/export', async (req, res) => {
  try {
    const { world, outputDir } = req.body
    if (!outputDir) return res.status(400).json({ error: 'outputDir required' })
    await mkdir(join(outputDir, 'exemplars'), { recursive: true })
    const written = []

    for (const entry of (world.content || [])) {
      if (!entry.id) continue
      const filePath = join(outputDir, 'exemplars', `${entry.id}.yaml`)
      await writeFile(filePath, yaml.dump(buildExemplarYaml(entry), { lineWidth: 120 }))
      written.push(filePath)
    }

    const ritus = buildRitus(world)
    if (ritus) {
      const p = join(outputDir, 'ritus.json')
      await writeFile(p, JSON.stringify(ritus, null, 2))
      written.push(p)
    }

    const codexPath = join(outputDir, 'codex.json')
    await writeFile(codexPath, JSON.stringify(buildCodex(world), null, 2))
    written.push(codexPath)

    const formaPath = join(outputDir, 'forma.json')
    await writeFile(formaPath, JSON.stringify(buildForma(world), null, 2))
    written.push(formaPath)

    const modusPath = join(outputDir, 'modus.json')
    await writeFile(modusPath, JSON.stringify(buildModus(world), null, 2))
    written.push(modusPath)

    const pcPath = join(outputDir, 'promptuarium.config.yaml')
    const packs = (world.contentTypes || [])
      .filter(ct => (ct.documentType || 'Item') !== 'ActiveEffect')
      .map(ct => ({
        id: ct.id,
        kind: ct.id,
        label: ct.label || ct.id,
        type: ct.documentType === 'Actor' ? 'Actor' : 'Item',
        outputDir: `./packs/${ct.id}`
      }))
    await writeFile(pcPath, yaml.dump({ exemplarsDir: './exemplars', packs }))
    written.push(pcPath)

    const htmlPath = join(outputDir, 'compendium.html')
    await writeFile(htmlPath, generateCompendiumHTML(world))
    written.push(htmlPath)

    for (const { path, content, once } of scaffoldFiles(world)) {
      const filePath = join(outputDir, path)
      if (once && existsSync(filePath)) continue
      await mkdir(dirname(filePath), { recursive: true })
      await writeFile(filePath, content)
      written.push(filePath)
    }

    res.json({ ok: true, files: written })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.listen(PORT, () => {
  console.log(`System Compendium Editor → http://localhost:${PORT}`)
})
