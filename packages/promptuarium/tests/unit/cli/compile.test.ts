import { describe, it, expect, vi, afterEach } from 'vitest'
import { mkdtemp, writeFile, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ClassicLevel } from 'classic-level'
import { runCompile } from '../../../src/cli/commands/compile.js'
import type { PromptariumConfig } from '../../../src/cli/config.js'

const dirs: string[] = []

async function tempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix))
  dirs.push(dir)
  return dir
}

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

const RULE_YAML = `
id: rule-ranged-attack
version: 0.1.0
kind: rule
name: Ranged Attack
pool: agility
ritus: standard-roll
on_tier:
  hit:
    damage: "1"
`

function baseConfig(overrides: Partial<PromptariumConfig>): PromptariumConfig {
  return {
    exemplarsDir: join(tmpdir(), 'promptuarium-empty-exemplars-does-not-exist'),
    outputDir: '',
    ...overrides,
  }
}

async function readPackEntries(outputDir: string, packId: string) {
  const db = new ClassicLevel<string, unknown>(join(outputDir, packId), { valueEncoding: 'json' })
  await db.open()
  const out: Array<{ key: string; value: unknown }> = []
  for await (const [key, value] of db.iterator()) out.push({ key, value })
  await db.close()
  return out
}

describe('runCompile', () => {
  it('exits 1 and writes no packs when neither outputs nor sequences are configured', async () => {
    const outputDir = await tempDir('promptuarium-out-')
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never)
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    await runCompile(baseConfig({ outputDir }))

    expect(exit).toHaveBeenCalledWith(1)
    expect(stderr.mock.calls.some(([msg]) => String(msg).includes('no pack outputs configured'))).toBe(true)
    await expect(readdir(outputDir)).resolves.toEqual([])
  })

  it('exits 1 on a malformed outputs entry and writes no packs', async () => {
    const outputDir = await tempDir('promptuarium-out-')
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never)
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    await runCompile(
      baseConfig({
        outputDir,
        outputs: [{ packId: '', documentType: 'RuleItem', kinds: ['rule'], fieldMap: {} }],
      }),
    )

    expect(exit).toHaveBeenCalledWith(1)
    await expect(readdir(outputDir)).resolves.toEqual([])
  })

  it('compiles a real exemplar into a pack keyed by Foundry collection', async () => {
    const exemplarsDir = await tempDir('promptuarium-exemplars-')
    const outputDir = await tempDir('promptuarium-out-')
    await writeFile(join(exemplarsDir, 'rule.yaml'), RULE_YAML, 'utf-8')
    vi.spyOn(process, 'stdout', 'get').mockReturnValue({ write: () => true } as never)

    await runCompile(
      baseConfig({
        exemplarsDir,
        outputDir,
        outputs: [{ packId: 'rules', documentType: 'RuleItem', kinds: ['rule'], fieldMap: { pool: 'pool' } }],
      }),
    )

    const entries = await readPackEntries(outputDir, 'rules')
    expect(entries).toHaveLength(1)
    expect(entries[0].key).toMatch(/^!items!/)
    expect((entries[0].value as { type: string }).type).toBe('RuleItem')
  })

  it('compiles a sequence source into the fixed dtk.sequence envelope', async () => {
    const sequencesDir = await tempDir('promptuarium-sequences-')
    const outputDir = await tempDir('promptuarium-out-')
    await writeFile(
      join(sequencesDir, 'ranged-attack.yaml'),
      `
id: sr.ranged-attack
systemId: shadowrun.dice-pool
name: Ranged Attack
steps:
  - type: rule
    id: attack
    pool: '@initiator.system.agility'
`,
      'utf-8',
    )
    vi.spyOn(process, 'stdout', 'get').mockReturnValue({ write: () => true } as never)

    await runCompile(
      baseConfig({ outputDir, sequences: { dir: sequencesDir, packId: 'sr-sequences' } }),
    )

    const entries = await readPackEntries(outputDir, 'sr-sequences')
    expect(entries).toHaveLength(1)
    const value = entries[0].value as { type: string; name: string; system: { id: string }; flags: unknown }
    expect(value.type).toBe('dtk.sequence')
    expect(value.name).toBe('Ranged Attack')
    expect(value.system.id).toBe('sr.ranged-attack')
    expect(value.flags).toEqual({})
  })

  it('exits 1 and writes no packs when a sequence document is invalid', async () => {
    const sequencesDir = await tempDir('promptuarium-sequences-')
    const outputDir = await tempDir('promptuarium-out-')
    await writeFile(join(sequencesDir, 'broken.yaml'), 'id: sr.broken\nsteps: []\n', 'utf-8')
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never)
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    await runCompile(
      baseConfig({ outputDir, sequences: { dir: sequencesDir, packId: 'sr-sequences' } }),
    )

    expect(exit).toHaveBeenCalledWith(1)
    expect(stderr.mock.calls.some(([msg]) => String(msg).includes('sequences'))).toBe(true)
    await expect(readdir(outputDir)).resolves.toEqual([])
  })
})
