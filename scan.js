// Reads a folder tree in the browser. Only names, sizes and dates are read, never file contents.
// Three sources produce the same model (see tree.js): a directory handle (Edge/Chrome picker or
// drag and drop), a FileSystemEntry (drag and drop in other browsers) and a webkitdirectory FileList.
import { makeDir, makeFile, finalize, isIgnored } from './tree.js';

const FILE_BATCH = 24;

function newStats() {
  return { ignored: 0, denied: [], unexplored: 0, files: 0, dirs: 0, emptyDirsVisible: true, depthLimited: false };
}

function abortIfNeeded(signal) {
  if (signal?.aborted) throw new DOMException('Scan cancelled', 'AbortError');
}

function reasonOf(error) {
  return error?.name === 'NotAllowedError' || error?.name === 'SecurityError' ? 'denied' : 'unreadable';
}

// Directory handle (File System Access API): the depth limit avoids reading what is not shown.
export async function scanHandle(rootHandle, { maxDepth, signal, onProgress = () => {} }) {
  const stats = newStats();
  const root = makeDir(rootHandle.name);
  const visit = async (handle, dir) => {
    abortIfNeeded(signal);
    const files = [], dirs = [];
    try {
      for await (const entry of handle.values()) {
        abortIfNeeded(signal);
        (entry.kind === 'directory' ? dirs : files).push(entry);
      }
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      stats.denied.push({ path: dir.path || dir.name, reason: reasonOf(error) });
      dir.note = 'denied';
      return;
    }
    const depth = dir.depth + 1;
    for (let start = 0; start < files.length; start += FILE_BATCH) {
      abortIfNeeded(signal);
      const batch = files.slice(start, start + FILE_BATCH).filter(entry => {
        if (!isIgnored(entry.name)) return true;
        stats.ignored++; return false;
      });
      const read = await Promise.all(batch.map(async entry => {
        const path = dir.path ? `${dir.path}/${entry.name}` : entry.name;
        try {
          const file = await entry.getFile();
          return makeFile(entry.name, path, depth, file.size, file.lastModified);
        } catch { return makeFile(entry.name, path, depth, null, null, 'unreadable'); }
      }));
      dir.children.push(...read);
      stats.files += read.length;
    }
    onProgress({ dirs: stats.dirs, files: stats.files, path: dir.path });
    for (const entry of dirs) {
      const sub = makeDir(entry.name, dir.path ? `${dir.path}/${entry.name}` : entry.name, depth);
      dir.children.push(sub);
      stats.dirs++;
      if (depth + 1 >= maxDepth) {
        // Not read further, but say whether something was left out.
        try {
          for await (const _ of entry.values()) { sub.note = 'unexplored'; stats.unexplored++; stats.depthLimited = true; break; }
        } catch (error) {
          if (error.name === 'AbortError') throw error;
          sub.note = 'denied'; stats.denied.push({ path: sub.path, reason: reasonOf(error) });
        }
      } else await visit(entry, sub);
    }
  };
  await visit(rootHandle, root);
  return { root: finalize(root), stats };
}

// FileSystemEntry (drag and drop outside Chromium). Empty folders are visible here too.
export async function scanEntry(rootEntry, { maxDepth, signal, onProgress = () => {} }) {
  const stats = newStats();
  const root = makeDir(rootEntry.name);
  const readAll = reader => new Promise((resolve, reject) => {
    const all = [];
    const next = () => reader.readEntries(batch => { if (!batch.length) resolve(all); else { all.push(...batch); next(); } }, reject);
    next();
  });
  const fileOf = entry => new Promise((resolve, reject) => entry.file(resolve, reject));
  const visit = async (entry, dir) => {
    abortIfNeeded(signal);
    let entries;
    try { entries = await readAll(entry.createReader()); }
    catch (error) { stats.denied.push({ path: dir.path || dir.name, reason: reasonOf(error) }); dir.note = 'denied'; return; }
    const depth = dir.depth + 1;
    const files = entries.filter(item => item.isFile), dirs = entries.filter(item => item.isDirectory);
    for (let start = 0; start < files.length; start += FILE_BATCH) {
      abortIfNeeded(signal);
      const batch = files.slice(start, start + FILE_BATCH).filter(item => {
        if (!isIgnored(item.name)) return true;
        stats.ignored++; return false;
      });
      const read = await Promise.all(batch.map(async item => {
        const path = dir.path ? `${dir.path}/${item.name}` : item.name;
        try { const file = await fileOf(item); return makeFile(item.name, path, depth, file.size, file.lastModified); }
        catch { return makeFile(item.name, path, depth, null, null, 'unreadable'); }
      }));
      dir.children.push(...read);
      stats.files += read.length;
    }
    onProgress({ dirs: stats.dirs, files: stats.files, path: dir.path });
    for (const item of dirs) {
      const sub = makeDir(item.name, dir.path ? `${dir.path}/${item.name}` : item.name, depth);
      dir.children.push(sub);
      stats.dirs++;
      if (depth + 1 >= maxDepth) {
        try {
          const content = await new Promise((resolve, reject) => item.createReader().readEntries(resolve, reject));
          if (content.length) { sub.note = 'unexplored'; stats.unexplored++; stats.depthLimited = true; }
        } catch (error) { sub.note = 'denied'; stats.denied.push({ path: sub.path, reason: reasonOf(error) }); }
      } else await visit(item, sub);
    }
  };
  await visit(rootEntry, root);
  return { root: finalize(root), stats };
}

// <input webkitdirectory>: the browser lists every file first. Empty folders are not included,
// and the depth limit can only be applied afterwards.
export async function scanFileList(fileList, { maxDepth, signal, onProgress = () => {} }) {
  const stats = newStats();
  stats.emptyDirsVisible = false;
  const files = [...fileList];
  if (!files.length) return null;
  const rootName = files[0].webkitRelativePath.split('/')[0] || 'Dossier';
  const root = makeDir(rootName);
  const dirs = new Map([['', root]]);
  const dirFor = parts => {
    let current = root;
    for (let index = 0; index < parts.length; index++) {
      const path = parts.slice(0, index + 1).join('/');
      let next = dirs.get(path);
      if (!next) {
        next = makeDir(parts[index], path, index);
        current.children.push(next); dirs.set(path, next); stats.dirs++;
      }
      current = next;
    }
    return current;
  };
  for (let index = 0; index < files.length; index++) {
    if (index % 2000 === 0) { abortIfNeeded(signal); onProgress({ dirs: stats.dirs, files: stats.files, path: '' }); await new Promise(resolve => setTimeout(resolve)); }
    const file = files[index];
    const parts = file.webkitRelativePath.split('/').slice(1);
    const name = parts.pop();
    if (!name) continue;
    if (isIgnored(name)) { stats.ignored++; continue; }
    if (parts.length >= maxDepth) {
      // Beyond the depth limit: mark the last listed folder instead of listing the file.
      const holder = dirFor(parts.slice(0, maxDepth));
      if (holder.note !== 'unexplored') { holder.note = 'unexplored'; stats.unexplored++; stats.depthLimited = true; }
      continue;
    }
    dirFor(parts).children.push(makeFile(name, parts.length ? `${parts.join('/')}/${name}` : name, parts.length, file.size, file.lastModified));
    stats.files++;
  }
  return { root: finalize(root), stats };
}

// Drag and drop: the handle (Chromium) or entry must be requested during the drop event itself.
export function dropSources(dataTransfer) {
  return [...dataTransfer.items].filter(item => item.kind === 'file').map(item => ({
    handle: typeof item.getAsFileSystemHandle === 'function' ? item.getAsFileSystemHandle() : null,
    entry: typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null,
  }));
}
