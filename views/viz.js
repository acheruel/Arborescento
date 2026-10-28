// Three views of the same tree, drawn as SVG without a library: mind map, sunburst and treemap.
import { FAMILIES, family, ageBucket, walk } from '../tree.js';

const NS = 'http://www.w3.org/2000/svg';
// Categorical slots validated for colour-vision deficiency (adjacent pairs); "other" folds into grey.
export const FAMILY_COLORS = { pdf: '#2a78d6', cad: '#eb6834', office: '#1baf7a', image: '#eda100', archive: '#e87ba4', media: '#008300', other: '#898781' };
// One-hue ordinal ramp, dark = recent: < 15 days, < 3 months, < 1 year, < 2 years, older.
export const AGE_COLORS = ['#104281', '#1c5cab', '#2a78d6', '#5598e7', '#86b6ef'];
const UNKNOWN = '#c3c2b7';

const el = (name, attributes = {}, parent) => {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  parent?.append(node);
  return node;
};
const title = (node, text) => { el('title', {}, node).textContent = text; return node; };

// Dominant family (by size, then count) of each folder, computed once per tree.
const dominantCache = new WeakMap();
function dominant(dir) {
  if (dominantCache.has(dir)) return dominantCache.get(dir);
  const weight = Object.fromEntries(FAMILIES.map(name => [name, 0]));
  walk(dir, node => { if (node.kind === 'file') weight[family(node.ext)] += (node.size || 0) + 1; });
  const best = FAMILIES.reduce((a, b) => (weight[b] > weight[a] ? b : a));
  const result = weight[best] ? best : null;
  dominantCache.set(dir, result);
  return result;
}

export class Viz {
  constructor(container, { describe, labels, formatSize }) {
    this.container = container; this.describe = describe; this.labels = labels; this.formatSize = formatSize;
    this.mode = 'map'; this.color = 'type'; this.measure = 'size';
    this.expanded = new Set(['']); this.focus = ''; this.zoom = 1;
  }

  setTree(root, now) {
    const changed = root !== this.root;
    this.root = root; this.now = now;
    if (changed) {
      // Keep the open folders and the focus when they still exist in the new view.
      if (!this.find(this.focus)) this.focus = '';
      if (!this.initialized) { this.initialized = true; for (const child of root.children) if (child.kind === 'dir') this.expanded.add(child.path); }
    }
    this.render();
  }

  find(path) {
    if (!this.root) return null;
    if (!path) return this.root;
    let node = this.root;
    for (const part of path.split('/')) {
      node = node.children.find(child => child.kind === 'dir' && child.name === part);
      if (!node) return null;
    }
    return node;
  }

  colorOf(node) {
    if (this.color === 'age') {
      const bucket = ageBucket(node.kind === 'dir' ? node.latest : node.mtime, this.now);
      return bucket < 0 ? UNKNOWN : AGE_COLORS[bucket];
    }
    const name = node.kind === 'dir' ? dominant(node) : family(node.ext);
    return name ? FAMILY_COLORS[name] : UNKNOWN;
  }

  value(node) {
    if (this.useCount) return node.kind === 'dir' ? node.files : 1;
    return node.size || 0;
  }

  render() {
    if (!this.root) return;
    this.useCount = this.measure === 'count' || !this.root.size;
    this.container.replaceChildren();
    if (!this.root.children.length) {
      const empty = document.createElement('p'); empty.className = 'viz-empty'; empty.textContent = this.labels().empty;
      this.container.append(empty); return;
    }
    if (this.mode === 'map') this.renderMap();
    else if (this.mode === 'sunburst') this.renderSunburst();
    else this.renderTreemap();
  }

  // ---- Mind map: horizontal tree of folders, folded and unfolded by clicking ----
  renderMap() {
    const ROW = 28, LEFT = 16, GAP = 46;
    const nodes = [], links = [];
    let cursor = 0;
    const largest = Math.max(1, ...this.root.children.filter(child => child.kind === 'dir').map(child => this.value(child)));
    const layout = (dir, depth) => {
      const subs = dir.children.filter(child => child.kind === 'dir');
      const open = (dir === this.root || this.expanded.has(dir.path)) && !dir.hidden && subs.length;
      const item = { dir, depth, open, foldable: subs.length > 0 && !dir.hidden };
      item.name = dir === this.root ? this.root.name : dir.name;
      item.meta = this.describe(dir, true);
      item.radius = dir === this.root ? 7 : 4 + 7 * Math.sqrt(Math.min(1, this.value(dir) / largest));
      // Approximate text width: names at 12px, details at 11px.
      item.width = item.radius + 6 + item.name.length * 7 + 6 + item.meta.length * 6;
      nodes.push(item);
      if (open) {
        item.children = subs.map(sub => layout(sub, depth + 1));
        item.y = (item.children[0].y + item.children[item.children.length - 1].y) / 2;
        for (const child of item.children) links.push([item, child]);
      } else item.y = cursor++ * ROW + ROW;
      return item;
    };
    layout(this.root, 0);
    // Each column starts after the widest label of the previous one, so links never cross text.
    const columns = [];
    for (const item of nodes) columns[item.depth] = Math.max(columns[item.depth] || 0, item.width);
    const starts = [LEFT + 8];
    for (let depth = 1; depth < columns.length; depth++) starts[depth] = starts[depth - 1] + columns[depth - 1] + GAP;
    for (const item of nodes) item.x = starts[item.depth];
    const width = starts[columns.length - 1] + columns[columns.length - 1] + 24, height = cursor * ROW + ROW;
    const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, width: width * this.zoom, height: height * this.zoom, class: 'viz-map', role: 'img', 'aria-label': this.labels().mapLabel });
    for (const [from, to] of links) {
      const x0 = from.x + from.width + 4, x1 = to.x - to.radius - 2, middle = (x0 + x1) / 2;
      el('path', { d: `M${x0 - 2} ${from.y}C${middle} ${from.y} ${middle} ${to.y} ${x1} ${to.y}`, class: 'map-link' }, svg);
    }
    for (const item of nodes) {
      const group = el('g', { class: `map-node${item.foldable && item.dir !== this.root ? ' foldable' : ''}`, transform: `translate(${item.x} ${item.y})` }, svg);
      const color = this.colorOf(item.dir);
      el('circle', { r: item.radius, fill: item.open || !item.foldable ? color : '#ffffff', stroke: color, 'stroke-width': 2 }, group);
      const label = el('text', { x: item.radius + 6, y: 4 }, group);
      label.textContent = item.name;
      const meta = el('tspan', { class: 'map-meta', dx: 6 }, label);
      meta.textContent = item.meta;
      title(group, `${item.dir.path || item.dir.name} — ${this.describe(item.dir)}${item.foldable ? ` · ${this.labels()[item.open ? 'fold' : 'unfold']}` : ''}`);
      if (item.foldable && item.dir !== this.root) {
        group.setAttribute('tabindex', '0'); group.setAttribute('role', 'button');
        group.setAttribute('aria-expanded', String(Boolean(item.open)));
        const toggle = () => { if (item.open) this.expanded.delete(item.dir.path); else this.expanded.add(item.dir.path); this.render(); };
        group.addEventListener('click', toggle);
        group.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); } });
      }
    }
    const scroll = document.createElement('div'); scroll.className = 'viz-scroll';
    scroll.append(svg); this.container.append(scroll);
  }

  // ---- Sunburst: rings are levels, angles are sizes; click a folder to zoom in, the centre to go back ----
  renderSunburst() {
    const focus = this.find(this.focus) || this.root;
    const SIZE = 640, CENTER = SIZE / 2, RINGS = 4, INNER = 70, RING = (CENTER - INNER - 6) / RINGS;
    const svg = el('svg', { viewBox: `0 0 ${SIZE} ${SIZE}`, class: 'viz-sunburst', role: 'img', 'aria-label': this.labels().sunburstLabel });
    const total = this.value(focus);
    const arcs = [];
    const partition = (dir, start, end, level) => {
      if (level >= RINGS || dir.hidden) return;
      const sum = dir.children.reduce((acc, child) => acc + this.value(child), 0);
      if (!sum) return;
      let angle = start;
      for (const child of dir.children) {
        const span = (end - start) * this.value(child) / sum;
        if (span > 0.003) {
          arcs.push({ node: child, start: angle, end: angle + span, level });
          if (child.kind === 'dir') partition(child, angle, angle + span, level + 1);
        }
        angle += span;
      }
    };
    partition(focus, 0, Math.PI * 2, 0);
    const point = (angle, radius) => [CENTER + radius * Math.sin(angle), CENTER - radius * Math.cos(angle)];
    for (const arc of arcs) {
      const r0 = INNER + arc.level * RING, r1 = r0 + RING - 1.5;
      const large = arc.end - arc.start > Math.PI ? 1 : 0;
      const full = arc.end - arc.start > Math.PI * 2 - 0.0001;
      const end = full ? arc.end - 0.0001 : arc.end;
      const [a, b] = point(arc.start, r1), [c, d] = point(end, r1), [e, f] = point(end, r0), [g, h] = point(arc.start, r0);
      const path = el('path', { d: `M${a} ${b}A${r1} ${r1} 0 ${large} 1 ${c} ${d}L${e} ${f}A${r0} ${r0} 0 ${large} 0 ${g} ${h}Z`, fill: this.colorOf(arc.node), class: `sun-arc${arc.node.kind === 'dir' ? ' dir' : ''}` }, svg);
      title(path, `${arc.node.path} — ${this.describe(arc.node)}`);
      if (arc.node.kind === 'dir' && arc.node.children.length && !arc.node.hidden) {
        path.setAttribute('tabindex', '0'); path.setAttribute('role', 'button');
        const go = () => { this.focus = arc.node.path; this.render(); };
        path.addEventListener('click', go);
        path.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); go(); } });
      }
      // Direct label only where it fits along the arc.
      const middle = (arc.start + end) / 2, radius = (r0 + r1) / 2;
      const room = (end - arc.start) * radius;
      const name = arc.node.name.length > 18 ? `${arc.node.name.slice(0, 17)}…` : arc.node.name;
      if (room > name.length * 6.4 + 8 && arc.level < 3) {
        const [x, y] = point(middle, radius);
        let rotation = middle * 180 / Math.PI;
        if (rotation > 90 && rotation < 270) rotation -= 180;
        const label = el('text', { x, y, transform: `rotate(${rotation} ${x} ${y})`, class: 'sun-label', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, svg);
        label.textContent = name;
      }
    }
    const center = el('g', { class: `sun-center${focus !== this.root ? ' back' : ''}` }, svg);
    el('circle', { cx: CENTER, cy: CENTER, r: INNER - 4 }, center);
    const name = el('text', { x: CENTER, y: CENTER - 6, 'text-anchor': 'middle', class: 'sun-center-name' }, center);
    name.textContent = focus.name.length > 16 ? `${focus.name.slice(0, 15)}…` : focus.name;
    const meta = el('text', { x: CENTER, y: CENTER + 14, 'text-anchor': 'middle', class: 'sun-center-meta' }, center);
    meta.textContent = this.useCount ? this.labels().files(total) : this.formatSize(total);
    if (focus !== this.root) {
      center.setAttribute('tabindex', '0'); center.setAttribute('role', 'button');
      title(center, this.labels().up);
      const up = () => { this.focus = this.focus.split('/').slice(0, -1).join('/'); this.render(); };
      center.addEventListener('click', up);
      center.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); up(); } });
    }
    this.container.append(this.breadcrumb(), svg);
  }

  // ---- Treemap: rectangles proportional to size, two levels at a time; click a folder to zoom in ----
  renderTreemap() {
    const focus = this.find(this.focus) || this.root;
    const WIDTH = 1000, HEIGHT = 600, HEAD = 18;
    const svg = el('svg', { viewBox: `0 0 ${WIDTH} ${HEIGHT}`, class: 'viz-treemap', role: 'img', 'aria-label': this.labels().treemapLabel });
    // Each folder is one group (box, label and content), so a click anywhere in it zooms into it.
    const draw = (dir, x, y, w, h, level, parent) => {
      const items = dir.children.filter(child => this.value(child) > 0);
      for (const cell of squarify(items.map(node => ({ node, value: this.value(node) })), x, y, w, h)) {
        const { node } = cell;
        const gap = 1;
        const rx = cell.x + gap, ry = cell.y + gap, rw = Math.max(0, cell.w - gap * 2), rh = Math.max(0, cell.h - gap * 2);
        if (rw < 1 || rh < 1) continue;
        if (node.kind === 'dir') {
          const box = el('g', { class: 'tm-dir' }, parent);
          title(box, `${node.path} — ${this.describe(node)}`);
          if (rh > HEAD + 6 && rw > 30 && level < 1 && !node.hidden) {
            el('rect', { x: rx, y: ry, width: rw, height: rh, class: 'tm-dir-box' }, box);
            this.text(box, rx + 5, ry + 13, node.name, rw - 10, 'tm-dir-label');
            draw(node, rx + 2, ry + HEAD, rw - 4, rh - HEAD - 2, level + 1, box);
          } else {
            el('rect', { x: rx, y: ry, width: rw, height: rh, fill: this.colorOf(node), class: 'tm-fill' }, box);
            if (rh > 16 && rw > 40) this.text(box, rx + 5, ry + 13, node.name, rw - 10, 'tm-label');
          }
          if (node.children.length && !node.hidden) {
            box.setAttribute('tabindex', '0'); box.setAttribute('role', 'button');
            const go = () => { this.focus = node.path; this.render(); };
            box.addEventListener('click', event => { event.stopPropagation(); go(); });
            box.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); go(); } });
          }
        } else {
          const rect = el('rect', { x: rx, y: ry, width: rw, height: rh, fill: this.colorOf(node), class: 'tm-fill' }, parent);
          title(rect, `${node.path} — ${this.describe(node)}`);
          if (rh > 16 && rw > 50) this.text(parent, rx + 5, ry + 13, node.name, rw - 10, 'tm-label');
        }
      }
    };
    draw(focus, 0, 0, WIDTH, HEIGHT, 0, svg);
    this.container.append(this.breadcrumb(), svg);
  }

  // Text shortened by measuring characters, never by cropping the mark.
  text(parent, x, y, value, room, className) {
    const fit = Math.floor(room / 6.6);
    if (fit < 3) return;
    const label = el('text', { x, y, class: className }, parent);
    label.textContent = value.length > fit ? `${value.slice(0, fit - 1)}…` : value;
  }

  breadcrumb() {
    const nav = document.createElement('nav'); nav.className = 'viz-breadcrumb'; nav.setAttribute('aria-label', this.labels().path);
    const parts = this.focus ? this.focus.split('/') : [];
    const add = (label, path) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'crumb'; button.textContent = label;
      if (path === this.focus) button.setAttribute('aria-current', 'page');
      button.addEventListener('click', () => { this.focus = path; this.render(); });
      nav.append(button);
    };
    add(this.root.name, '');
    parts.forEach((part, index) => add(part, parts.slice(0, index + 1).join('/')));
    return nav;
  }
}

// Squarified treemap layout (Bruls, Huizing and van Wijk).
export function squarify(items, x, y, w, h) {
  const sorted = items.filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, item) => sum + item.value, 0);
  const out = [];
  if (!total || w <= 0 || h <= 0) return out;
  const scale = (w * h) / total;
  let rest = sorted.map(item => ({ ...item, area: item.value * scale }));
  while (rest.length) {
    const side = Math.min(w, h);
    let row = [rest[0]], best = worst(row, side), index = 1;
    while (index < rest.length) {
      const next = worst([...row, rest[index]], side);
      if (next > best) break;
      row.push(rest[index]); best = next; index++;
    }
    const area = row.reduce((sum, item) => sum + item.area, 0);
    if (w >= h) {
      const width = area / h; let top = y;
      for (const item of row) { const height = item.area / width; out.push({ ...item, x, y: top, w: width, h: height }); top += height; }
      x += width; w -= width;
    } else {
      const height = area / w; let left = x;
      for (const item of row) { const width = item.area / height; out.push({ ...item, x: left, y, w: width, h: height }); left += width; }
      y += height; h -= height;
    }
    rest = rest.slice(index);
  }
  return out;
}

function worst(row, side) {
  const sum = row.reduce((acc, item) => acc + item.area, 0);
  const max = Math.max(...row.map(item => item.area)), min = Math.min(...row.map(item => item.area));
  return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
}
