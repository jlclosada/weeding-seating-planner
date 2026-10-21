import { normalize } from './text';

const NAME_HEADERS = ['nombre', 'name', 'invitado', 'guest', 'nombre completo', 'full name'];
const GROUP_HEADERS = ['grupo', 'group', 'categoria', 'category'];
const DIET_HEADERS = ['dieta', 'menu', 'menú', 'alergias', 'diet', 'notas dieta'];

const findCol = (header, names) => header.findIndex((h) => names.includes(normalize(h)));

/** Filas (array de arrays) → [{ name, group, diet }]. Admite cabecera opcional. */
export function rowsToEntries(rows) {
  const clean = rows
    .map((r) => (Array.isArray(r) ? r : [r]).map((c) => (c == null ? '' : String(c).trim())))
    .filter((r) => r.some(Boolean));
  if (!clean.length) return [];

  let nameCol = 0;
  let groupCol = -1;
  let dietCol = -1;
  const header = clean[0];
  const hName = findCol(header, NAME_HEADERS);
  if (hName !== -1) {
    nameCol = hName;
    groupCol = findCol(header, GROUP_HEADERS);
    dietCol = findCol(header, DIET_HEADERS);
    clean.shift();
  }

  return clean
    .map((r) => ({ name: r[nameCol] ?? '', group: groupCol >= 0 ? r[groupCol] : '', diet: dietCol >= 0 ? r[dietCol] : '' }))
    .filter((e) => e.name);
}

/** CSV sencillo con comillas, separador `,` o `;` (Excel en español usa `;`). */
export function parseCSV(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

export async function readGuestFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    return rowsToEntries(parseCSV(await file.text()));
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await import('xlsx');
    const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return rowsToEntries(XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false }));
  }
  throw new Error('Formato no soportado. Usa .xlsx, .xls o .csv');
}

/** Separa entradas nuevas de las que ya existen (sin distinguir mayúsculas ni tildes). */
export function splitDuplicates(entries, existingGuests) {
  const seen = new Set(existingGuests.map((g) => normalize(g.name)));
  const fresh = [];
  const duplicates = [];
  for (const e of entries) {
    const key = normalize(e.name);
    if (seen.has(key)) duplicates.push(e);
    else {
      seen.add(key);
      fresh.push(e);
    }
  }
  return { fresh, duplicates };
}
