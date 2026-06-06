// Tiny dependency-free CSV parser. Handles quoted fields, escaped quotes,
// commas and newlines inside quotes, and CRLF line endings.

export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      pushField();
    } else if (c === "\n") {
      pushRow();
    } else if (c === "\r") {
      // skip; handled by following \n (or end of file)
      if (text[i + 1] !== "\n") {
        pushRow();
      }
    } else {
      field += c;
    }
  }

  // flush trailing field/row if any content remains
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim());
  const out: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    // skip fully empty trailing lines
    if (cols.length === 1 && cols[0] === "") continue;
    const obj: Record<string, string> = {};
    for (let c = 0; c < header.length; c++) {
      obj[header[c]] = cols[c] ?? "";
    }
    out.push(obj);
  }
  return out;
}
