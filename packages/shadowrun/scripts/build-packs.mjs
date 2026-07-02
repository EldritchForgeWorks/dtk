// Compiles JSON source files from src/packs/ into LevelDB compendium packs.
// Run with: npm run build:packs
// Requires: classic-level (devDependency)
import { ClassicLevel } from 'classic-level';
import { readFileSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const PACKS = [
  { src: 'src/packs/sr-ritus',    out: 'packs/sr-ritus' },
  { src: 'src/packs/sr-sequences', out: 'packs/sr-sequences' },
];

for (const { src, out } of PACKS) {
  const srcDir = join(ROOT, src);
  const outDir = join(ROOT, out);

  try { rmSync(outDir, { recursive: true, force: true }); } catch {}
  mkdirSync(outDir, { recursive: true });

  // Foundry V12+ LevelDB format: key = "!items!{_id}", value = utf8 JSON string
  const db = new ClassicLevel(outDir, { keyEncoding: 'utf8', valueEncoding: 'utf8' });
  await db.open();

  const files = readdirSync(srcDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const raw = readFileSync(join(srcDir, file), 'utf-8');
    const doc = JSON.parse(raw);
    await db.put(`!items!${doc._id}`, raw);
  }

  await db.close();
  console.log(`[build-packs] ${out}: packed ${files.length} documents`);
}
