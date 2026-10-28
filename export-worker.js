/* ExcelJS runs in a separate worker so generating Excel stays cancellable.
   Same layout as the Python script: description lines, one column per level, size, date, bytes, remark. */
importScripts('./vendor/exceljs.min.js');

const HOT = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
const OLD = { color: { argb: 'FF808080' }, italic: true };
const FOLDER = { bold: true, underline: true, color: { argb: 'FF000080' } };
const GROUP = { italic: true, color: { argb: 'FF595959' } };
const REMARK = { color: { argb: 'FFC00000' } };
const DAY = 86400000;

// Excel stores dates without a time zone: keep the local calendar day and time shown in the browser.
function excelDate(time) {
  const date = new Date(time);
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
}

self.onmessage = async ({ data }) => {
  try {
    const { rows, header, headings, sheetName, now, hotDays, oldDays } = data;
    const levels = rows.reduce((most, row) => Math.max(most, row.depth + 1), 1);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Arborescento';
    workbook.created = new Date();
    const top = header.length + 1;
    const sheet = workbook.addWorksheet(sheetName, { views: [{ showGridLines: false, state: 'frozen', ySplit: top }] });
    header.forEach((text, index) => { sheet.getCell(index + 1, 1).value = text; });
    const titles = [...Array.from({ length: levels }, (_, index) => `${headings.level} ${index + 1}`), headings.size, headings.date, headings.bytes, headings.remark];
    sheet.getRow(top).values = titles;
    sheet.getRow(top).font = { bold: true };
    const sizeColumn = levels + 1, dateColumn = levels + 2, bytesColumn = levels + 3, remarkColumn = levels + 4;
    rows.forEach((row, index) => {
      const line = sheet.getRow(top + 1 + index);
      const nameCell = line.getCell(row.depth + 1);
      // Names stay plain strings, never formulas, even when they start with "=".
      if (row.type === 'dir' && row.link) nameCell.value = { text: row.name, hyperlink: row.link };
      else nameCell.value = row.name;
      if (row.type === 'dir') { nameCell.font = FOLDER; line.getCell(sizeColumn).value = '---'; }
      else if (row.type === 'group') nameCell.font = GROUP;
      if (row.type !== 'dir' && row.sizeText) line.getCell(sizeColumn).value = row.sizeText;
      if (row.type !== 'dir' && row.size !== null) { const cell = line.getCell(bytesColumn); cell.value = row.size; cell.numFmt = '#,##0'; }
      if (row.mtime !== null) {
        const cell = line.getCell(dateColumn);
        cell.value = excelDate(row.mtime); cell.numFmt = 'yyyy-mm-dd';
        const age = (now - row.mtime) / DAY;
        if (age < hotDays) cell.fill = HOT; else if (age > oldDays) cell.font = OLD;
      }
      if (row.remark) { const cell = line.getCell(remarkColumn); cell.value = row.remark; cell.font = REMARK; }
    });
    sheet.getColumn(levels).width = 85;
    sheet.getColumn(sizeColumn).width = 11.5;
    sheet.getColumn(dateColumn).width = 17;
    sheet.getColumn(bytesColumn).width = 15;
    sheet.getColumn(remarkColumn).width = 36;
    const bytes = await workbook.xlsx.writeBuffer();
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    self.postMessage({ buffer }, [buffer]);
  } catch (error) { self.postMessage({ error: error.message }); }
};
