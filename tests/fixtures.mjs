import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, rm, utimes } from 'node:fs/promises';

export const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const generated = path.join(root, 'tests', 'generated');
const require = createRequire(import.meta.url);
export function dependency(name) {
  for (const base of [import.meta.url, path.join(process.env.USERPROFILE || process.env.HOME || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'package.json'), '/opt/node-tools/node_modules/package.json']) {
    try { return createRequire(base)(name); } catch {}
  }
  return require(name);
}

const DAY = 86400000;

// Synthetic project folder on disk: grouping, natural order, ignored files, empty folder,
// formula-like name, accents, old and recent files, and a branch deeper than the default limit.
export async function createFixtures() {
  const base = path.join(generated, 'Projet_test');
  await rm(base, { recursive: true, force: true });
  const file = async (relative, size = 10, ageDays = 1) => {
    const full = path.join(base, relative);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, Buffer.alloc(size, 120));
    const time = new Date(Date.now() - ageDays * DAY);
    await utimes(full, time, time);
  };
  await file('b.md', 5); await file('A.md', 7); await file('Résumé.md', 9);
  await file('=1+1.md', 1);
  await file('Thumbs.db', 3); await file('~$Brouillon.docx', 3); await file('trace.log', 3);
  for (let index = 1; index <= 12; index++) await file(`Plans/plan_${index}.pdf`, 1000 * index, 20);
  await file('Plans/dessin_1.dwg', 5000, 20); await file('Plans/dessin_2.dwg', 5000, 20);
  await file('Calculs/Archives/2019/vieux.xlsx', 2048, 3 * 365);
  await file('Calculs/note.docx', 4096, 3);
  await mkdir(path.join(base, 'Vide'), { recursive: true });
  await file('Profond/N2/N3/N4/N5/N6/N7/N8/tres_profond.txt', 100, 400);
  return base;
}
