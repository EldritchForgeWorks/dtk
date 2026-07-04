import { describe, it, expect, afterEach } from 'vitest'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadConfig, ConfigParseError } from '../../../src/cli/config.js'

const dirs: string[] = []

async function tempConfigFile(contents: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'promptuarium-config-'))
  dirs.push(dir)
  const filePath = join(dir, 'promptuarium.config.yaml')
  await writeFile(filePath, contents, 'utf-8')
  return filePath
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('loadConfig', () => {
  it('falls back to defaults when no config file exists', async () => {
    const config = await loadConfig(join(tmpdir(), 'promptuarium-does-not-exist.yaml'))
    expect(config.exemplarsDir).toBe('./exemplars')
    expect(config.outputDir).toBe('./packs')
    expect(config.outputs).toBeUndefined()
    expect(config.sequences).toBeUndefined()
  })

  it('parses an outputs array of mapper entries', async () => {
    const filePath = await tempConfigFile(`
outputs:
  - packId: rules
    documentType: RuleItem
    kinds: [rule]
    fieldMap:
      pool: pool
`)
    const config = await loadConfig(filePath)
    expect(config.outputs).toEqual([
      { packId: 'rules', documentType: 'RuleItem', kinds: ['rule'], fieldMap: { pool: 'pool' } },
    ])
  })

  it('parses a sequences source key', async () => {
    const filePath = await tempConfigFile(`
sequences:
  dir: ./sequences
  packId: sr-sequences
`)
    const config = await loadConfig(filePath)
    expect(config.sequences).toEqual({ dir: './sequences', packId: 'sr-sequences' })
  })

  it('throws ConfigParseError on malformed YAML instead of silently returning defaults', async () => {
    const filePath = await tempConfigFile('outputs: [this is not: valid: yaml')
    await expect(loadConfig(filePath)).rejects.toThrow(ConfigParseError)
  })
})
