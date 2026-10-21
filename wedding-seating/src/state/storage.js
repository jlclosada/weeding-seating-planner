import { createEmptyDoc, normalizeDoc } from './model';

export const STORAGE_KEY = 'wsp:doc:v2';
const LEGACY_KEYS = { tables: 'wedding-tables', guests: 'wedding-guests', groups: 'wedding-groups' };

const read = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/** Carga el documento guardado; si solo existe el formato antiguo (3 claves), lo migra. */
export function loadDoc() {
  const current = read(STORAGE_KEY);
  if (current) return { doc: normalizeDoc(current), source: 'saved' };

  const legacy = { tables: read(LEGACY_KEYS.tables), guests: read(LEGACY_KEYS.guests), groups: read(LEGACY_KEYS.groups) };
  if (legacy.tables?.length || legacy.guests?.length) {
    // Las claves antiguas se dejan intactas como copia de seguridad.
    return { doc: normalizeDoc({ ...legacy, version: 1 }), source: 'migrated' };
  }
  return { doc: createEmptyDoc(), source: 'empty' };
}

export function saveDoc(doc) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
    return true;
  } catch {
    return false;
  }
}
