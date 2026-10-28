# Arborescento — folder tree to Excel

Version 0.1 · [Version française](README_FR.md)

List a folder tree, explore it, visualise it and export it to Excel. **Everything runs in your browser: only names, sizes and dates are read, nothing is uploaded.**

**[Open Arborescento](https://acheruel.github.io/Arborescento/)** — or click **Try an example**.

- **Explore** the tree with live filters (name, extension, date, size, depth); groups many files of one type on a single “[......]” line.
- **Visualise** it as a mind map, sunburst or treemap, coloured by file type or age.
- **Statistics**: key figures, file types, activity timeline, active and dormant folders.
- **Excel** export with one column per level, size, date and remarks, plus clickable folder links when you paste the folder path.

Works best in Edge or Chrome (reads only the levels shown, lists empty folders, lets you choose where to save). Firefox and Safari read the whole folder and download the file.

Run locally: double-click `Lancer.cmd` (Node.js), or `node server.mjs --open`. Tests: `npm install && npm test`. The original Python script (v0.3) is in [`python/`](python/).

Anthony Chéruel · [GPL-3.0](LICENSE) · ExcelJS 4.4.0 (MIT, [THIRD_PARTY.md](THIRD_PARTY.md))
