import { describe, it, expect, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ClassicLevel } from 'classic-level'
import { LevelDBCompendiumTarget } from '../../src/adapters/node/LevelDBCompendiumTarget.js'
import type { CompiledEntry } from '../../src/domain/value-objects/CompiledEntry.js'

const dirs: string[] = []

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'leveldb-target-'))
  dirs.push(dir)
  return dir
}

const ENTRY: CompiledEntry = {
  _id: 'abc123',
  name: 'Test',
  type: 'ritus',
  system: {},
  flags: {},
}

describe('LevelDBCompendiumTarget', () => {
  it('keys Item-class entries by collection (items), not by the document subtype', async () => {
    const outputDir = await tempDir()
    const target = new LevelDBCompendiumTarget(outputDir)
    await target.write('sr-ritus', [ENTRY])

    const db = new ClassicLevel<string, unknown>(join(outputDir, 'sr-ritus'), { valueEncoding: 'json' })
    await db.open()
    const keys: string[] = []
    for await (const key of db.keys()) keys.push(key)
    await db.close()

    expect(keys).toEqual(['!items!abc123'])
  })

  it('defaults to Item collection when documentClass is omitted', async () => {
    const outputDir = await tempDir()
    const target = new LevelDBCompendiumTarget(outputDir)
    await target.write('pack', [ENTRY])

    const db = new ClassicLevel<string, unknown>(join(outputDir, 'pack'), { valueEncoding: 'json' })
    await db.open()
    const keys: string[] = []
    for await (const key of db.keys()) keys.push(key)
    await db.close()

    expect(keys[0]).toMatch(/^!items!/)
  })
})
