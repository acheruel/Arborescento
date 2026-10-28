// Statistics of the current view: key figures, file families, activity timeline, hot and dormant folders.
import { FAMILIES, family, walk, DAY, HOT_DAYS, DORMANT_DAYS } from './tree.js';

export function computeStats(root, now = Date.now()) {
  const byFamily = Object.fromEntries(FAMILIES.map(name => [name, { count: 0, size: 0 }]));
  const months = new Map();
  let emptyDirs = 0, maxDepth = 0, undated = 0;
  const folders = [];
  walk(root, node => {
    maxDepth = Math.max(maxDepth, node.depth + 1);
    if (node.kind === 'dir') {
      if (!node.children.length && !node.note) emptyDirs++;
      folders.push(node);
      return;
    }
    const slot = byFamily[family(node.ext)];
    slot.count++; slot.size += node.size || 0;
    if (node.mtime === null) { undated++; return; }
    const date = new Date(node.mtime);
    const key = date.getFullYear() * 12 + date.getMonth();
    months.set(key, (months.get(key) || 0) + 1);
  });
  // Hot: folders that directly hold files modified less than 15 days ago, most active first.
  const hot = folders.map(dir => ({ dir, recent: dir.children.filter(child => child.kind === 'file' && child.mtime !== null && now - child.mtime < HOT_DAYS * DAY).length }))
    .filter(item => item.recent).sort((a, b) => b.recent - a.recent || b.dir.latest - a.dir.latest);
  // Dormant: the shallowest folders whose whole content is older than two years, largest first.
  const dormant = [];
  const visit = dir => {
    for (const child of dir.children) {
      if (child.kind !== 'dir' || child.latest === null) continue;
      if (now - child.latest >= DORMANT_DAYS * DAY) dormant.push(child); else visit(child);
    }
  };
  visit(root);
  dormant.sort((a, b) => b.size - a.size);
  return {
    dirs: root.dirs, files: root.files, size: root.size, maxDepth, emptyDirs, undated,
    byFamily, timeline: timeline(months), hot, dormant,
    dormantSize: dormant.reduce((sum, dir) => sum + dir.size, 0),
  };
}

// Monthly counts, or yearly ones when the span is too long to read month by month.
function timeline(months) {
  if (!months.size) return { unit: 'month', bars: [] };
  const keys = [...months.keys()];
  const first = Math.min(...keys), last = Math.max(...keys);
  if (last - first < 48) {
    const bars = [];
    for (let key = first; key <= last; key++) bars.push({ year: Math.floor(key / 12), month: key % 12, count: months.get(key) || 0 });
    return { unit: 'month', bars };
  }
  const years = new Map();
  for (const [key, count] of months) years.set(Math.floor(key / 12), (years.get(Math.floor(key / 12)) || 0) + count);
  const bars = [];
  for (let year = Math.floor(first / 12); year <= Math.floor(last / 12); year++) bars.push({ year, count: years.get(year) || 0 });
  return { unit: 'year', bars };
}
