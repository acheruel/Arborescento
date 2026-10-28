# Arborescento — folder tree to Excel

Version 0.1 · October 28, 2026 · [Version française](README_FR.md)

List a folder tree, explore it with filters, visualise it and export it to Excel. **Everything runs in your browser: only names, sizes and dates are read, no file is opened or uploaded.** Web version of the “Extraction liste dossiers fichiers” Python script, with the same Excel layout.

**[Open Arborescento](https://acheruel.github.io/Arborescento/)** — or click **Try an example** to test it with a fictitious project.

## Features

- **Choose a folder** or **drag and drop** it, local or on a network drive. Adjustable max. depth (7 by default, as in the script).
- **Grouping** of many files of the same type on one “[......] 12 .pdf files: … (grouped, ≥ 10)” line. Per-extension thresholds come from the script and can be edited and saved in the browser.
- **Explore**: expandable tree with cumulative size, file count and latest file date per folder. Live filters: name or path search (with `*`, accent-insensitive), extensions, date range, minimum size, levels shown.
- **Visualise**: foldable mind map, zoomable sunburst and treemap. Colour by file type or age, measure by size or file count.
- **Statistics**: key figures, breakdown by type (count and size), modification timeline, “where things move” folders (last 15 days) and dormant folders (over 2 years).
- **Excel**: one column per level, size, last modified (real date, green when recent, grey when old), bytes and remarks (access denied, not explored…). Clickable links to subfolders when you paste the folder path. Export the full tree or the filtered view only.
- French / English interface.

## Browsers

| | Edge / Chrome | Firefox / Safari |
|---|---|---|
| Reading | Only the levels shown are read | The browser lists the whole folder, then the depth is applied |
| Empty folders | Yes | With drag and drop only |
| Saving the Excel file | You choose where | Download |

Browsers never reveal the full folder path: to get clickable links in Excel, paste it in the field provided (e.g. `P:\Projects\12345`). They do not provide folder modification dates either: a folder takes the date of the most recent file it contains. A browser prompt such as “Upload N files to this site?” does not mean anything is sent: nothing leaves the device.

As in the script, temporary and system files (Thumbs.db, desktop.ini, .DS_Store, `~$…`, `.~lock.…`, `.log`, `.tmp`) are skipped and counted in the scan information.

## Run locally

Double-click **Lancer.cmd** (Windows, requires Node.js) and open <http://127.0.0.1:8765>, or serve the folder with any static server: `node server.mjs --open`. Do not open `index.html` directly — ES modules and workers require HTTP.

## Python script

The [`python/`](python/) folder holds version 0.3 of the script (same Excel file, `pip install -r python/requirements.txt`), still useful for very large network drives. Compared with 0.2: an unreadable folder no longer stops the run, links and junctions are not followed, names starting with “=” stay text, natural sort, real dates and byte sizes, choice of where to save the Excel file.

## Tests

```bash
npm install
npm test
```

Use `CHROME_PATH=/path/to/chrome` or `TEST_BROWSER=msedge` to pick the browser. See [VALIDATION.md](VALIDATION.md).

## Files

`index.html` / `styles.css` (interface) · `app.js` (state, filters, translations, export) · `scan.js` (folder reading) · `tree.js` (model, grouping, filters) · `stats.js` (statistics) · `views/viz.js` (mind map, sunburst, treemap) · `example.js` (fictitious project) · `export-worker.js` (Excel generation) · `vendor/` (ExcelJS 4.4.0, MIT — see [THIRD_PARTY.md](THIRD_PARTY.md)) · `python/` (script v0.3).

Author: Anthony Chéruel. GPL-3.0 licence ([LICENSE](LICENSE)). Published with GitHub Pages from the `main` branch.
