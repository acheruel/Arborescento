// Tree model shared by the explorer, the visualisations, the statistics and the Excel export.
// Pure functions only: no DOM, so tests can run them directly in Node.

export const DEFAULT_MAX_DEPTH = 7;
export const MAX_DEPTH_LIMIT = 50;
export const DAY = 86400000;
export const HOT_DAYS = 15;
export const OLD_DAYS = 365;
export const DORMANT_DAYS = 730;

// Same defaults as the Python script v0.3: group files of one extension from this count.
export const DEFAULT_THRESHOLDS = {
  '.pdf': 10, '.dwg': 5, '.dcn': 2, '.jpg': 5, '.jpeg': 5, '.mov': 1, '.png': 5, '.docx': 8, '.doc': 8,
  '.xls': 7, '.xlsx': 7, '.xlsm': 7, '.txt': 2, '.dgn': 2, '.tif': 2, '.tiff': 2, '.zip': 5, '.heic': 2, '.ctb': 2,
};

const IGNORED_NAMES = new Set(['thumbs.db', '.ds_store', 'desktop.ini']);
const IGNORED_PREFIXES = ['~$', '.~lock.'];
const IGNORED_EXTENSIONS = new Set(['.log', '.tmp']);

export const FAMILIES = ['pdf', 'cad', 'office', 'image', 'archive', 'media', 'other'];
const FAMILY_EXTENSIONS = {
  pdf: ['.pdf'],
  cad: ['.dwg', '.dxf', '.dgn', '.dcn', '.ctb', '.stb', '.rvt', '.rfa', '.ifc', '.nwd', '.nwc', '.skp', '.3dm', '.step', '.stp', '.sat'],
  office: ['.doc', '.docx', '.docm', '.dot', '.dotx', '.xls', '.xlsx', '.xlsm', '.xlsb', '.csv', '.ppt', '.pptx', '.pptm', '.msg', '.eml', '.txt', '.rtf', '.odt', '.ods', '.odp', '.one', '.vsd', '.vsdx', '.mpp'],
  image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tif', '.tiff', '.heic', '.webp', '.svg', '.raw', '.cr2', '.nef'],
  archive: ['.zip', '.7z', '.rar', '.tar', '.gz', '.tgz', '.bz2', '.xz', '.iso'],
  media: ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.m4v', '.mp3', '.wav', '.m4a', '.flac', '.wma'],
};
const EXTENSION_FAMILY = new Map(Object.entries(FAMILY_EXTENSIONS).flatMap(([family, list]) => list.map(ext => [ext, family])));

export function extension(name) {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot).toLowerCase() : '';
}
export const family = ext => EXTENSION_FAMILY.get(ext) || 'other';

export function isIgnored(name) {
  const lower = name.toLowerCase();
  return IGNORED_NAMES.has(lower) || IGNORED_PREFIXES.some(prefix => lower.startsWith(prefix)) || IGNORED_EXTENSIONS.has(extension(lower));
}

const collator = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });
// Natural order, case-insensitive: A.txt before b.txt, plan_2 before plan_10.
export const naturalCompare = (a, b) => collator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);

export function makeDir(name, path = '', depth = -1) {
  return { kind: 'dir', name, path, depth, children: [], note: '' };
}
export function makeFile(name, path, depth, size, mtime, note = '') {
  return { kind: 'file', name, path, depth, size, mtime, ext: extension(name), note };
}

// Sorts children (files first, then folders, as in the Python script) and computes
// size, file and folder counts and the latest file date of every folder.
export function finalize(dir) {
  dir.children.sort((a, b) => (a.kind === b.kind ? naturalCompare(a.name, b.name) : a.kind === 'file' ? -1 : 1));
  dir.size = 0; dir.files = 0; dir.dirs = 0; dir.latest = null; dir.maxDepth = dir.depth;
  for (const child of dir.children) {
    if (child.kind === 'dir') {
      finalize(child);
      dir.size += child.size; dir.files += child.files; dir.dirs += child.dirs + 1;
      if (child.latest !== null && (dir.latest === null || child.latest > dir.latest)) dir.latest = child.latest;
      dir.maxDepth = Math.max(dir.maxDepth, child.maxDepth);
    } else {
      dir.size += child.size || 0; dir.files++;
      if (child.mtime !== null && (dir.latest === null || child.mtime > dir.latest)) dir.latest = child.mtime;
      dir.maxDepth = Math.max(dir.maxDepth, child.depth);
    }
  }
  return dir;
}

export function walk(dir, visit) {
  for (const child of dir.children) {
    visit(child);
    if (child.kind === 'dir') walk(child, visit);
  }
}

// Accent- and case-insensitive text; '*' is a wildcard, otherwise the query is a substring.
const fold = text => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
export function searchMatcher(query) {
  const folded = fold(query.trim());
  if (!folded) return null;
  if (!folded.includes('*')) return text => fold(text).includes(folded);
  const pattern = new RegExp(folded.split('*').map(part => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*'));
  return text => pattern.test(fold(text));
}

export const emptyFilters = () => ({ search: '', extensions: [], from: '', to: '', minSize: 0, depth: 0 });
export const filtersActive = f => Boolean(f.search.trim() || f.extensions.length || f.from || f.to || f.minSize || f.depth);

// Returns a pruned copy of the tree holding only what passes the filters, with aggregates recomputed.
// A file passes when its path matches the search and it passes the extension, date and size filters.
// A folder stays when it keeps a file, or when its own path matches the search and no file filter is set.
export function filterTree(root, filters) {
  const match = searchMatcher(filters.search);
  const extensions = new Set(filters.extensions);
  const from = filters.from ? Date.parse(`${filters.from}T00:00:00`) : null;
  const to = filters.to ? Date.parse(`${filters.to}T23:59:59.999`) : null;
  const fileFilters = extensions.size || from !== null || to !== null || filters.minSize > 0;
  const fileOk = file => (!match || match(file.path)) && (!extensions.size || extensions.has(file.ext || '(none)'))
    && (from === null || (file.mtime !== null && file.mtime >= from)) && (to === null || (file.mtime !== null && file.mtime <= to))
    && (!filters.minSize || (file.size || 0) >= filters.minSize);
  const copy = dir => {
    const out = { ...dir, children: [] };
    for (const child of dir.children) {
      if (child.kind === 'file') { if (fileOk(child)) out.children.push(child); continue; }
      const kept = copy(child);
      if (kept.children.length || (!fileFilters && (!match || match(child.path)))) out.children.push(kept);
    }
    return out;
  };
  const result = copy(root);
  if (filters.depth) prune(result, filters.depth);
  return finalize(result);
}

function prune(dir, levels) {
  for (const child of dir.children) {
    if (child.kind !== 'dir') continue;
    if (child.depth + 1 >= levels) { if (child.children.length) child.hidden = true; }
    else prune(child, levels);
  }
}

// Rows of one folder level: groups first, then the remaining files, then folders (Python script order).
export function levelRows(dir, grouping) {
  const files = dir.children.filter(child => child.kind === 'file');
  const dirs = dir.children.filter(child => child.kind === 'dir');
  const rows = [], grouped = new Set();
  if (grouping.enabled) {
    const byExt = new Map();
    for (const file of files) byExt.set(file.ext, [...(byExt.get(file.ext) || []), file]);
    for (const [ext, members] of byExt) {
      const threshold = grouping.thresholds[ext];
      if (threshold === undefined || members.length < Math.max(1, threshold)) continue;
      let size = 0, mtime = null;
      for (const file of members) {
        size += file.size || 0; grouped.add(file);
        if (file.mtime !== null && (mtime === null || file.mtime > mtime)) mtime = file.mtime;
      }
      rows.push({ type: 'group', depth: dir.depth + 1, key: `${dir.path}\u0000${ext}`, ext, threshold, members, size, mtime, path: dir.path });
    }
  }
  for (const file of files) if (!grouped.has(file)) rows.push({ type: 'file', depth: file.depth, node: file });
  for (const sub of dirs) rows.push({ type: 'dir', depth: sub.depth, node: sub });
  return rows;
}

// Flat list of rows in tree order. expanded(path) decides which folders are open (all when omitted);
// expandedGroups(key) decides which groups list their files.
export function flatten(root, grouping, expanded = () => true, expandedGroups = () => false) {
  const out = [];
  const visit = dir => {
    for (const row of levelRows(dir, grouping)) {
      out.push(row);
      if (row.type === 'dir' && !row.node.hidden && expanded(row.node.path)) visit(row.node);
      else if (row.type === 'group' && expandedGroups(row.key)) for (const file of row.members) out.push({ type: 'file', depth: file.depth, node: file, inGroup: true });
    }
  };
  visit(root);
  return out;
}

export function extensionCounts(root) {
  const counts = new Map();
  walk(root, node => { if (node.kind === 'file') { const key = node.ext || '(none)'; counts.set(key, (counts.get(key) || 0) + 1); } });
  return [...counts].sort((a, b) => b[1] - a[1] || naturalCompare(a[0], b[0]));
}

export function ageBucket(time, now) {
  if (time === null || time === undefined) return -1;
  const days = (now - time) / DAY;
  return days < HOT_DAYS ? 0 : days < 90 ? 1 : days < OLD_DAYS ? 2 : days < DORMANT_DAYS ? 3 : 4;
}

export function parseThresholds(value) {
  const out = {};
  if (!value || typeof value !== 'object') return { ...DEFAULT_THRESHOLDS };
  for (const [key, raw] of Object.entries(value)) {
    const ext = normalizeExtension(key), count = Number(raw);
    if (ext && Number.isInteger(count) && count >= 1 && count <= 100000) out[ext] = count;
  }
  return out;
}
export function normalizeExtension(value) {
  const text = String(value).trim().toLowerCase().replace(/^\*/, '');
  if (!text) return '';
  const ext = text.startsWith('.') ? text : `.${text}`;
  return /^\.[^\s.\\/]{1,20}$/.test(ext) ? ext : '';
}
