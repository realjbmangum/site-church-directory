/**
 * Small CSV reader for the Charlotte seed files.
 * Handles quoted commas, escaped quotes, and Windows newlines.
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const useful = rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
  if (useful.length === 0) return [];
  const header = useful[0].map((cell) => cell.trim());
  return useful.slice(1).map((cells) => {
    const record = {};
    header.forEach((key, index) => {
      record[key] = cells[index] == null ? '' : cells[index];
    });
    return record;
  });
}
