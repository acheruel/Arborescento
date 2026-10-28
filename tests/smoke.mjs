import assert from 'node:assert/strict';
import path from 'node:path';
import { readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import { createFixtures, dependency, generated, root } from './fixtures.mjs';
import { createServer } from '../server.mjs';
import { naturalCompare, searchMatcher, isIgnored, filterTree, emptyFilters, levelRows, flatten, makeDir, makeFile, finalize,
  parseThresholds, normalizeExtension, DEFAULT_THRESHOLDS } from '../tree.js';
import { squarify } from '../views/viz.js';
import { computeStats } from '../stats.js';
import { exampleTree } from '../example.js';

// ---- Model checks in Node ----
assert.deepEqual(['b.txt', 'plan_10.pdf', 'A.txt', 'plan_2.pdf'].sort(naturalCompare), ['A.txt', 'b.txt', 'plan_2.pdf', 'plan_10.pdf']);
assert.ok(searchMatcher('*rapport*.pdf')('05/Rapport_final.pdf'));
assert.ok(!searchMatcher('*rapport*.pdf')('05/Rapport_final.docx'));
assert.ok(searchMatcher('resume')('Résumé.txt'), 'Search ignores accents and case');
assert.equal(searchMatcher('  '), null);
for (const name of ['Thumbs.db', 'desktop.ini', '~$Plan.docx', '.~lock.x#', 'run.LOG', 'a.tmp']) assert.ok(isIgnored(name), name);
assert.ok(!isIgnored('plan.pdf'));
assert.equal(normalizeExtension('PDF'), '.pdf'); assert.equal(normalizeExtension('*.Dwg'), '.dwg'); assert.equal(normalizeExtension('a b'), '');
assert.deepEqual(parseThresholds({ pdf: 3, '.x': 0, bad: 'y' }), { '.pdf': 3 });
{
  const tree = makeDir('R');
  const sub = makeDir('S', 'S', 0); tree.children.push(sub);
  for (let index = 1; index <= 3; index++) sub.children.push(makeFile(`p${index}.pdf`, `S/p${index}.pdf`, 1, 100, Date.UTC(2026, 0, index)));
  sub.children.push(makeFile('n.txt', 'S/n.txt', 1, 5, null));
  finalize(tree);
  assert.equal(tree.size, 305); assert.equal(tree.files, 4); assert.equal(sub.latest, Date.UTC(2026, 0, 3));
  const rows = levelRows(sub, { enabled: true, thresholds: { '.pdf': 3 } });
  assert.deepEqual(rows.map(row => row.type), ['group', 'file']);
  assert.equal(rows[0].members.length, 3); assert.equal(rows[0].size, 300);
  assert.equal(flatten(tree, { enabled: false, thresholds: {} }).length, 5);
  const filtered = filterTree(tree, { ...emptyFilters(), extensions: ['.txt'] });
  assert.equal(filtered.files, 1); assert.equal(tree.files, 4, 'Filtering never mutates the tree');
}
{
  const cells = squarify([{ value: 6 }, { value: 6 }, { value: 4 }, { value: 3 }, { value: 2 }, { value: 2 }, { value: 1 }], 0, 0, 600, 400);
  assert.equal(cells.length, 7);
  assert.ok(Math.abs(cells.reduce((sum, cell) => sum + cell.w * cell.h, 0) - 240000) < 1e-6, 'Treemap fills the area');
}
{
  const { root: demo } = exampleTree(Date.UTC(2026, 9, 28));
  const stats = computeStats(demo, Date.UTC(2026, 9, 28));
  assert.equal(stats.files, 214); assert.equal(stats.dirs, 21); assert.equal(stats.emptyDirs, 1);
  assert.ok(stats.hot.length > 0 && stats.dormant.some(dir => dir.path === '99_Archives'));
}

// ---- Browser checks ----
const fixture = await createFixtures();
const output = path.join(root, 'tests', 'output');
await mkdir(output, { recursive: true });
const { chromium } = dependency('playwright');
const JSZip = dependency('jszip');
const server = createServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const launch = process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : process.env.TEST_BROWSER ? { channel: process.env.TEST_BROWSER } : {};
const browser = await chromium.launch({ headless: true, ...launch });

// Description of the fixture folder, used to build fake directory handles in the page.
async function describeFolder(folder) {
  const entries = [];
  for (const name of await readdir(folder)) {
    const full = path.join(folder, name), info = await stat(full);
    entries.push(info.isDirectory() ? { name, children: await describeFolder(full) } : { name, size: info.size, mtime: info.mtimeMs });
  }
  return entries;
}
const spec = { name: 'Projet_test', children: [...await describeFolder(fixture), { name: 'Prive', denied: true, children: [] }] };

// Fake File System Access API: directory handles from the description, save picker writing to memory.
const pickerMock = ({ spec, delay }) => {
  const wait = () => new Promise(resolve => setTimeout(resolve, delay));
  const handle = node => node.children ? {
    kind: 'directory', name: node.name,
    async *values() {
      if (node.denied) throw new DOMException('Denied', 'NotAllowedError');
      for (const child of node.children) { if (delay) await wait(); yield handle(child); }
    },
  } : { kind: 'file', name: node.name, getFile: async () => new File([new Uint8Array(node.size)], node.name, { lastModified: node.mtime }) };
  window.showDirectoryPicker = async () => handle(window.__spec || spec);
  window.showSaveFilePicker = async options => {
    window.__suggested = options.suggestedName;
    return { createWritable: async () => ({ write: async blob => { window.__saved = [...new Uint8Array(await blob.arrayBuffer())]; }, close: async () => {} }) };
  };
};

async function readWorkbook(bytes) {
  const zip = await JSZip.loadAsync(Buffer.from(bytes));
  return {
    sheet: await zip.file('xl/worksheets/sheet1.xml').async('string'),
    strings: await zip.file('xl/sharedStrings.xml')?.async('string') ?? '',
    rels: await zip.file('xl/worksheets/_rels/sheet1.xml.rels')?.async('string') ?? '',
  };
}
// The tree is virtualised: scroll through it to collect every row label.
const rowTexts = page => page.evaluate(async () => {
  const scroller = document.querySelector('#tree-scroll'), seen = new Map();
  for (let top = 0; ; top += scroller.clientHeight) {
    scroller.scrollTop = top;
    scroller.dispatchEvent(new Event('scroll'));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    for (const row of document.querySelectorAll('#tree-body .tree-row')) seen.set(Number(/translateY\((\d+)px\)/.exec(row.style.transform)[1]), row.querySelector('.label').textContent);
    if (top + scroller.clientHeight >= scroller.scrollHeight) break;
  }
  scroller.scrollTop = 0; scroller.dispatchEvent(new Event('scroll'));
  return [...seen].sort((a, b) => a[0] - b[0]).map(([, text]) => text);
});

const errors = [], requests = [], writes = [];
const watch = page => {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => { requests.push(request.url()); if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.method()); });
};

const summary = { date: new Date().toISOString(), version: '0.1', browser: await browser.version() };
try {
  // ---- Edge / Chrome path: directory picker and save picker ----
  const context = await browser.newContext({ viewport: { width: 1360, height: 1000 }, locale: 'fr-CA' });
  await context.addInitScript(pickerMock, { spec, delay: 0 });
  const page = await context.newPage();
  watch(page);
  await page.goto(base);
  await page.waitForFunction(() => !document.querySelector('#choose').disabled);
  assert.equal(await page.locator('h1').innerText(), 'ARBORESCENTO');
  assert.match(await page.locator('.privacy').innerText(), /100 % local[\s\S]*Aucun fichier n’est ouvert ni envoyé en ligne/);
  assert.equal(await page.locator('footer time').getAttribute('datetime'), '2026-10-28');
  assert.match(await page.locator('footer').innerText(), /v0\.1/);
  assert.equal(await page.locator('.github-link').getAttribute('href'), 'https://github.com/acheruel/Arborescento');
  assert.match(await page.locator('#browser-note').innerText(), /Edge \/ Chrome/);
  await page.screenshot({ path: path.join(output, 'start.png'), fullPage: true });

  await page.locator('#choose').click();
  await page.waitForSelector('#results:not([hidden])');
  await page.waitForFunction(() => document.querySelector('#progress-card').hidden);
  // 12 PDF + 2 DWG + A, b, Résumé, =1+1 + vieux.xlsx + note.docx + tres_profond (beyond depth 7: not read).
  assert.equal(await page.locator('#count-files').innerText(), '20');
  assert.match(await page.locator('#status').innerText(), /inaccessibles/);
  const warnings = await page.locator('#warning-list').innerText();
  assert.match(warnings, /3 fichier\(s\) temporaire/);
  assert.match(warnings, /Dossiers inaccessibles : Prive/);
  assert.match(warnings, /1 dossier\(s\) au-delà de la profondeur/);
  let labels = await rowTexts(page);
  assert.deepEqual(labels.slice(0, 4), ['=1+1.md', 'A.md', 'b.md', 'Résumé.md'], 'Files first, natural order, formula-like name as text');
  assert.ok(labels.includes('Vide'), 'Empty folder listed');
  assert.ok(labels.some(text => /^\[\.\.\.\.\.\.\] 12 fichiers \.pdf : plan_1\.pdf … plan_12\.pdf \(regroupés car ≥ 10\)$/.test(text)), 'PDF group label');
  assert.ok(!labels.some(text => /Thumbs|~\$|trace\.log/.test(text)), 'Ignored files hidden');
  const prive = page.locator('.tree-row', { hasText: 'Prive' });
  assert.equal(await prive.locator('.remark').innerText(), 'Accès refusé');
  assert.equal(await page.locator('.tree-row.dir', { hasText: 'Calculs' }).locator('.date').getAttribute('class'), 'cell date hot');
  // Open a group, then the whole tree.
  await page.locator('.tree-row.group .toggle').first().click();
  assert.ok((await rowTexts(page)).includes('plan_2.pdf'));
  await page.locator('#expand-all').click();
  labels = await rowTexts(page);
  assert.ok(labels.includes('vieux.xlsx') && labels.includes('N7'));
  assert.equal(await page.locator('.tree-row', { hasText: 'N7' }).locator('.remark').innerText(), 'Contenu non exploré (profondeur max)');
  assert.equal(await page.locator('.tree-row.file', { hasText: 'vieux.xlsx' }).locator('.date').getAttribute('class'), 'cell date old');
  await page.screenshot({ path: path.join(output, 'explorer.png'), fullPage: true });

  // Filters: search, extension chips, size, depth, reset.
  await page.locator('#search').fill('resume');
  await page.waitForFunction(() => document.querySelector('#visible-count').textContent.startsWith('1 fichier '));
  await page.locator('#search').fill('*plan_*');
  await page.waitForFunction(() => document.querySelector('#visible-count').textContent.startsWith('12 fichiers'));
  await page.locator('#search').fill('');
  await page.locator('.chip[data-ext=".dwg"]').click();
  assert.match(await page.locator('#visible-count').innerText(), /^2 fichiers et 1 dossier affichés sur 20 fichiers/);
  await page.locator('#reset-filters').click();
  await page.locator('#min-size').selectOption(String(100 * 1024));
  assert.match(await page.locator('#visible-count').innerText(), /^0 fichier/);
  assert.equal(await page.locator('.tree-empty').count(), 1);
  await page.locator('#reset-filters').click();
  await page.locator('#depth-shown').selectOption('1');
  assert.deepEqual(await page.locator('.tree-row.dir .toggle').count(), 0, 'One level: folders are not expandable');
  await page.locator('#reset-filters').click();

  // Grouping thresholds editor: change PDF threshold to 20 (no more PDF group), then defaults.
  await page.evaluate(() => { document.querySelector('#thresholds-panel').open = true; });
  // The thresholds editor lives in the upload card; show it for this check only.
  await page.evaluate(() => { document.querySelector('#dropzone').hidden = false; });
  await page.locator('#threshold-list input[data-ext=".pdf"]').fill('20');
  await page.locator('#threshold-list input[data-ext=".pdf"]').dispatchEvent('change');
  assert.ok(!(await rowTexts(page)).some(text => text.includes('fichiers .pdf')));
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('arborescento-thresholds'))['.pdf']), 20);
  await page.locator('#threshold-reset').click();
  assert.ok((await rowTexts(page)).some(text => text.includes('12 fichiers .pdf')));
  await page.evaluate(() => { document.querySelector('#dropzone').hidden = true; });

  // Visualisations.
  await page.locator('#tab-viz').click();
  assert.ok(await page.locator('.viz-map .map-node').count() >= 6);
  assert.equal(await page.locator('.viz-map .map-node', { hasText: 'Archives' }).count(), 1, 'First level unfolded');
  await page.getByRole('button', { name: /^Calculs — / }).click();
  assert.equal(await page.locator('.viz-map .map-node', { hasText: 'Archives' }).count(), 0, 'Mind map folds on click');
  await page.getByRole('button', { name: /^Calculs — / }).click();
  assert.equal(await page.locator('.viz-map .map-node', { hasText: 'Archives' }).count(), 1, 'Mind map unfolds on click');
  await page.locator('#viz-color [data-value="age"]').click();
  assert.equal(await page.locator('#legend li').count(), 6);
  await page.screenshot({ path: path.join(output, 'mindmap.png'), fullPage: true });
  await page.locator('#viz-mode [data-value="sunburst"]').click();
  assert.ok(await page.locator('.viz-sunburst .sun-arc').count() > 10);
  await page.locator('.sun-arc.dir').first().click();
  assert.equal(await page.locator('.viz-breadcrumb .crumb').count(), 2, 'Sunburst zooms into a folder');
  await page.locator('.sun-center.back').click();
  assert.equal(await page.locator('.viz-breadcrumb .crumb').count(), 1);
  await page.locator('#viz-color [data-value="type"]').click();
  await page.screenshot({ path: path.join(output, 'sunburst.png'), fullPage: true });
  await page.locator('#viz-mode [data-value="treemap"]').click();
  assert.ok(await page.locator('.viz-treemap rect').count() > 10);
  await page.locator('.tm-dir', { hasText: 'Plans' }).first().click();
  assert.equal(await page.locator('.viz-breadcrumb .crumb').last().innerText(), 'Plans');
  await page.screenshot({ path: path.join(output, 'treemap.png'), fullPage: true });

  // Statistics.
  await page.locator('#tab-stats').click();
  const statsText = await page.locator('#stats-content').innerText();
  assert.match(statsText, /PDF/); assert.match(statsText, /Dossiers où ça bouge/); assert.match(statsText, /Dossiers dormants/);
  assert.equal(await page.locator('.timeline .column').count() > 0, true);
  await page.screenshot({ path: path.join(output, 'stats.png'), fullPage: true });

  // English.
  await page.locator('#lang-en').click();
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.equal(await page.evaluate(() => localStorage.getItem('arborescento-language')), 'en');
  assert.match(await page.locator('#stats-content').innerText(), /Where things move/);
  await page.locator('#tab-explorer').click();
  assert.ok((await rowTexts(page)).some(text => /^\[\.\.\.\.\.\.\] 12 \.pdf files/.test(text)));
  await page.locator('#lang-fr').click();

  // Excel export with links, through the save picker.
  await page.locator('#root-path').fill('P:\\Projets\\Test');
  await page.locator('#download').click();
  await page.waitForFunction(() => window.__saved);
  assert.match(await page.locator('#status').innerText(), /enregistré/);
  assert.match(await page.evaluate(() => window.__suggested), /^Arborescence_Projet_test_\d{8}_\d{6}\.xlsx$/);
  const full = await readWorkbook(await page.evaluate(() => window.__saved));
  assert.match(full.strings, /Généré avec Arborescento v0\.1 — acheruel\.github\.io\/Arborescento/);
  assert.match(full.strings, /Dossier racine : P:\\Projets\\Test/);
  assert.match(full.strings, /Niveau 7/, 'One column per level actually present');
  assert.doesNotMatch(full.strings, /Niveau 8/);
  assert.match(full.strings, /=1\+1\.md/);
  assert.match(full.strings, /\[\.\.\.\.\.\.\] 12 fichiers \.pdf/);
  assert.match(full.strings, /Accès refusé/);
  assert.doesNotMatch(full.sheet, /<f[ >]/, 'No formula');
  assert.doesNotMatch(full.strings, /atkins/i);
  assert.match(full.sheet, /ySplit="10"/);
  assert.match(full.rels, /Target="P:\\Projets\\Test\\Calculs\\Archives"/);
  const fullRows = (full.sheet.match(/<row /g) || []).length;
  await writeFile(path.join(output, 'arborescence.xlsx'), Buffer.from(await page.evaluate(() => window.__saved)));

  // Filtered export: only the DWG files and their folder.
  await page.locator('.chip[data-ext=".dwg"]').click();
  await page.locator('#export-filtered').check();
  await page.evaluate(() => { delete window.__saved; });
  await page.locator('#download').click();
  await page.waitForFunction(() => window.__saved);
  const filtered = await readWorkbook(await page.evaluate(() => window.__saved));
  assert.match(filtered.strings, /Vue filtrée : extensions \.dwg/);
  assert.match(filtered.strings, /dessin_2\.dwg/);
  assert.doesNotMatch(filtered.strings, /plan_1\.pdf|vieux\.xlsx/);
  assert.ok(fullRows > (filtered.sheet.match(/<row /g) || []).length + 10);
  await page.locator('#reset-filters').click();

  // Cancel a slow scan, then mobile layout.
  await page.evaluate(() => {
    const original = window.showDirectoryPicker;
    window.showDirectoryPicker = async () => {
      const handle = await original();
      const values = handle.values.bind(handle);
      return { ...handle, async *values() { for await (const entry of values()) { await new Promise(resolve => setTimeout(resolve, 300)); yield entry; } } };
    };
  });
  await page.locator('#clear').click();
  await page.locator('#choose').click();
  await page.waitForFunction(() => !document.querySelector('#progress-card').hidden);
  await page.locator('#cancel').click();
  await page.waitForFunction(() => document.querySelector('#progress-card').hidden);
  assert.match(await page.locator('#status').innerText(), /annulée/);
  assert.equal(await page.locator('#results').isVisible(), false);

  await page.locator('#demo').click();
  assert.equal(await page.locator('#count-files').innerText(), '214');
  await page.setViewportSize({ width: 390, height: 844 });
  for (const tab of ['explorer', 'viz', 'stats']) {
    await page.locator(`#tab-${tab}`).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `No horizontal overflow on mobile (${tab})`);
  }
  await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
  await context.close();

  // ---- Firefox-like path: no File System Access API, folder input and download ----
  const basic = await browser.newContext({ viewport: { width: 1360, height: 1000 }, locale: 'fr-CA', acceptDownloads: true });
  await basic.addInitScript(() => { delete window.showDirectoryPicker; delete window.showSaveFilePicker; delete Window.prototype.showDirectoryPicker; delete Window.prototype.showSaveFilePicker; });
  const page2 = await basic.newPage();
  watch(page2);
  await page2.goto(base);
  await page2.waitForFunction(() => !document.querySelector('#choose').disabled);
  assert.match(await page2.locator('#browser-note').innerText(), /liste tout le dossier/);
  await page2.locator('#max-depth').fill('3');
  await page2.locator('#folder-input').setInputFiles(fixture);
  await page2.waitForSelector('#results:not([hidden])');
  await page2.waitForFunction(() => document.querySelector('#progress-card').hidden);
  // Depth 3: vieux.xlsx (level 4) and tres_profond.txt are beyond the limit.
  assert.equal(await page2.locator('#count-files').innerText(), '19');
  const basicWarnings = await page2.locator('#warning-list').textContent();
  assert.match(basicWarnings, /ne voit pas les dossiers vides/);
  assert.match(basicWarnings, /2 dossier\(s\) au-delà/);
  await page2.locator('#expand-all').click();
  assert.ok(!(await rowTexts(page2)).includes('Vide'));
  const downloadPromise = page2.waitForEvent('download');
  await page2.locator('#download').click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /^Arborescence_Projet_test_/);
  const saved = path.join(output, 'download.xlsx');
  await download.saveAs(saved);
  const { readFile } = await import('node:fs/promises');
  const basicBook = await readWorkbook(await readFile(saved));
  assert.match(basicBook.strings, /Niveau 3/); assert.doesNotMatch(basicBook.strings, /Niveau 4/);
  assert.equal(basicBook.rels, '', 'No links without a folder path');
  assert.match(await page2.locator('#status').innerText(), /Téléchargement lancé/);
  await basic.close();

  assert.deepEqual(errors, []);
  assert.ok(requests.every(url => url.startsWith(base) || url.startsWith('blob:') || url.startsWith('data:')), 'No external requests');
  assert.deepEqual(writes, [], 'No upload or other HTTP write request');
  summary.checks = 'model (natural order, search, ignored files, grouping, filters, stats, treemap), picker scan with denied folder and depth limit, explorer rows and remarks, filters, thresholds editor and storage, mind map, sunburst, treemap, statistics, EN/FR, Excel via save picker (links, levels, no formula, header), filtered export, cancellation, example, mobile overflow, folder input scan with depth 3 and download, local-only requests';
  await writeFile(path.join(output, 'validation.json'), JSON.stringify(summary, null, 2));
  console.log('PASS: model, scan, explorer, filters, visualisations, statistics, Excel export, local-only processing');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
