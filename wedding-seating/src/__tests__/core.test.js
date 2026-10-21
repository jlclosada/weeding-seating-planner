import { describe, expect, it } from 'vitest';
import { historyReducer, initHistory } from '../state/reducer';
import { createEmptyDoc, makeGuest, makeTable, normalizeDoc } from '../state/model';
import { autoAssign, analyze } from '../lib/autoAssign';
import { findFreeSpot, layoutTables, tableBounds } from '../lib/geometry';
import { parseCSV, rowsToEntries, splitDuplicates } from '../lib/importGuests';
import { buildDemoDoc } from '../lib/demo';
import { initials, monogram } from '../lib/text';

const docWith = ({ tables = [], guests = [] } = {}) => ({ ...createEmptyDoc(), tables, guests });
const seatKeys = (doc) => doc.guests.filter((g) => g.tableId != null).map((g) => `${g.tableId}:${g.seat}`);
const overlaps = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

describe('historial', () => {
  it('deshace y rehace cualquier acción, incluida la primera', () => {
    let s = initHistory(createEmptyDoc());
    const t = makeTable({ name: 'Mesa 1' });
    s = historyReducer(s, { type: 'table/add', table: t, label: 'Añadir mesa' });
    expect(s.past).toHaveLength(1);
    s = historyReducer(s, { type: 'history/undo' });
    expect(s.doc.tables).toHaveLength(0);
    s = historyReducer(s, { type: 'history/redo' });
    expect(s.doc.tables).toHaveLength(1);
  });

  it('mover una mesa genera un único paso de historial', () => {
    const t = makeTable({ name: 'Mesa 1', x: 0, y: 0 });
    let s = initHistory(docWith({ tables: [t] }));
    s = historyReducer(s, { type: 'history/checkpoint', label: 'Mover mesa' });
    for (let i = 1; i <= 20; i++) s = historyReducer(s, { type: 'table/move', id: t.id, x: i, y: i });
    expect(s.past).toHaveLength(1);
    s = historyReducer(s, { type: 'history/undo' });
    expect(s.doc.tables[0].x).toBe(0);
  });
});

describe('reducer', () => {
  it('al soltar en un asiento ocupado intercambia a los invitados', () => {
    const t = makeTable({ name: 'Mesa', capacity: 4 });
    const a = { ...makeGuest('Ana'), tableId: t.id, seat: 0 };
    const b = { ...makeGuest('Bea'), tableId: t.id, seat: 1 };
    let s = initHistory(docWith({ tables: [t], guests: [a, b] }));
    s = historyReducer(s, { type: 'seat/assign', guestId: a.id, tableId: t.id, seat: 1 });
    const [ga, gb] = s.doc.guests;
    expect([ga.seat, gb.seat]).toEqual([1, 0]);
  });

  it('reducir asientos devuelve a la lista a quien se queda sin silla', () => {
    const t = makeTable({ name: 'Mesa', capacity: 4 });
    const g = { ...makeGuest('Ana'), tableId: t.id, seat: 3 };
    const s = historyReducer(initHistory(docWith({ tables: [t], guests: [g] })), { type: 'table/update', id: t.id, patch: { capacity: 2 } });
    expect(s.doc.guests[0].tableId).toBeNull();
  });

  it('capacidad vacía o inválida no rompe nada', () => {
    const t = makeTable({ name: 'Mesa', capacity: '' });
    expect(t.capacity).toBe(10);
    const s = historyReducer(initHistory(docWith({ tables: [t] })), { type: 'table/update', id: t.id, patch: { capacity: 'abc' } });
    expect(s.doc.tables[0].capacity).toBe(10);
  });

  it('sustituir mesas (plantilla) devuelve a todos los invitados a la lista y conserva los grupos', () => {
    const t = makeTable({ name: 'Mesa' });
    const g = { ...makeGuest('Ana', 'friends'), tableId: t.id, seat: 0 };
    const s = historyReducer(initHistory(docWith({ tables: [t], guests: [g] })), { type: 'tables/replace', tables: [makeTable({ name: 'Nueva' })] });
    expect(s.doc.guests[0]).toMatchObject({ tableId: null, seat: null, groupId: 'friends' });
    expect(s.doc.groups.map((x) => x.id)).toContain('friends');
  });

  it('borrar un grupo deja a sus invitados sin grupo', () => {
    const g = makeGuest('Ana', 'friends');
    const s = historyReducer(initHistory(docWith({ guests: [g] })), { type: 'group/delete', id: 'friends' });
    expect(s.doc.guests[0].groupId).toBeNull();
  });
});

describe('migración de datos antiguos', () => {
  it('repara invitados sentados en mesas que ya no existen y asientos duplicados', () => {
    const legacy = {
      version: 1,
      tables: [{ id: 1, name: 'Mesa 1', type: 'rectangular', capacity: 4, x: 100, y: 100, seats: [] }],
      guests: [
        { id: 10, name: 'Ana', tableId: 1, seatIndex: 0, group: 'family' },
        { id: 11, name: 'Bea', tableId: 1, seatIndex: 0, group: 'family' },
        { id: 12, name: 'Carlos', tableId: 999, seatIndex: 2, group: 'family-123' },
        { id: 13, name: '   ', tableId: null, seatIndex: null },
      ],
      groups: [{ id: 'family', name: 'Familia', color: '#BAFFC9' }],
    };
    const doc = normalizeDoc(legacy);
    expect(doc.tables[0].shape).toBe('rect');
    expect(doc.guests).toHaveLength(3);
    expect(doc.guests.find((g) => g.name === 'Ana')).toMatchObject({ tableId: 1, seat: 0 });
    expect(doc.guests.find((g) => g.name === 'Bea').tableId).toBeNull();
    expect(doc.guests.find((g) => g.name === 'Carlos')).toMatchObject({ tableId: null, groupId: null });
    expect(doc.groups[0].color).toMatch(/^#[0-9A-F]{6}$/i);
    expect(doc.groups[0].color).not.toBe('#BAFFC9');
  });
});

describe('sentar automáticamente', () => {
  it('respeta a quien ya está sentado, no duplica asientos y crea mesas si faltan', () => {
    const t = makeTable({ name: 'Mesa 1', capacity: 4 });
    const fixed = { ...makeGuest('Fija', 'friends'), tableId: t.id, seat: 2 };
    const guests = [fixed, ...Array.from({ length: 9 }, (_, i) => makeGuest(`G${i}`, i < 5 ? 'friends' : 'work'))];
    const r = autoAssign(docWith({ tables: [t], guests }));
    expect(r.guests.find((g) => g.id === fixed.id)).toMatchObject({ tableId: t.id, seat: 2 });
    expect(r.guests.every((g) => g.tableId != null)).toBe(true);
    const keys = seatKeys({ guests: r.guests });
    expect(new Set(keys).size).toBe(keys.length);
    expect(r.created.length).toBeGreaterThan(0);
    for (let i = 0; i < r.tables.length; i++) for (let j = i + 1; j < r.tables.length; j++) expect(overlaps(tableBounds(r.tables[i]), tableBounds(r.tables[j]))).toBe(false);
  });

  it('no sienta juntas a personas incompatibles si hay alternativa', () => {
    const t1 = makeTable({ name: 'A', capacity: 4 });
    const t2 = makeTable({ name: 'B', capacity: 4, x: 400 });
    const a = makeGuest('Marcos', 'friends');
    const b = makeGuest('Lucía', 'friends');
    const r = autoAssign({ ...docWith({ tables: [t1, t2], guests: [a, b] }), avoid: [[a.id, b.id]] });
    const [ra, rb] = r.guests;
    expect(ra.tableId).not.toBe(rb.tableId);
  });

  it('mantiene juntos a los grupos cuando caben', () => {
    const tables = [makeTable({ name: 'A', capacity: 10 }), makeTable({ name: 'B', capacity: 10, x: 400 })];
    const guests = [...Array.from({ length: 6 }, (_, i) => makeGuest(`F${i}`, 'family-bride')), ...Array.from({ length: 6 }, (_, i) => makeGuest(`W${i}`, 'work'))];
    const r = autoAssign(docWith({ tables, guests }));
    const tablesOf = (group) => new Set(r.guests.filter((g) => g.groupId === group).map((g) => g.tableId));
    expect(tablesOf('family-bride').size).toBe(1);
    expect(tablesOf('work').size).toBe(1);
  });
});

describe('geometría', () => {
  it('las mesas nuevas nunca se solapan', () => {
    const tables = [];
    for (let i = 0; i < 15; i++) {
      const spec = { shape: i % 4 ? 'round' : 'rect', capacity: 6 + (i % 7) };
      tables.push(makeTable({ ...spec, name: `M${i}`, ...findFreeSpot(tables, spec, { x: 500, y: 300 }) }));
    }
    for (let i = 0; i < tables.length; i++) for (let j = i + 1; j < tables.length; j++) expect(overlaps(tableBounds(tables[i]), tableBounds(tables[j]))).toBe(false);
  });

  it('las distribuciones no solapan mesas', () => {
    const placed = layoutTables([{ shape: 'rect', capacity: 8 }, ...Array.from({ length: 8 }, () => ({ shape: 'round', capacity: 10 }))]);
    for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) expect(overlaps(tableBounds(placed[i]), tableBounds(placed[j]))).toBe(false);
  });
});

describe('importación', () => {
  it('lee CSV con punto y coma, comillas y cabecera', () => {
    const rows = parseCSV('Nombre;Grupo;Dieta\n"García, Ana";Amigos;Vegana\nLuis Pérez;;\n');
    expect(rowsToEntries(rows)).toEqual([
      { name: 'García, Ana', group: 'Amigos', diet: 'Vegana' },
      { name: 'Luis Pérez', group: '', diet: '' },
    ]);
  });

  it('detecta duplicados sin distinguir tildes ni mayúsculas', () => {
    const { fresh, duplicates } = splitDuplicates([{ name: 'jose perez' }, { name: 'Marta' }, { name: 'MARTA' }], [makeGuest('José Pérez')]);
    expect(fresh.map((e) => e.name)).toEqual(['Marta']);
    expect(duplicates).toHaveLength(2);
  });
});

describe('texto', () => {
  it('iniciales y monograma', () => {
    expect(initials('María José García')).toBe('MG');
    expect(initials('Íñigo')).toBe('ÍÑ');
    expect(monogram('Elena & Pablo')).toBe('E&P');
    expect(monogram('Elena y Pablo')).toBe('E&P');
  });
});

describe('ejemplo y avisos', () => {
  it('la boda de ejemplo es coherente', () => {
    const doc = buildDemoDoc();
    const keys = seatKeys(doc);
    expect(new Set(keys).size).toBe(keys.length);
    expect(analyze(doc).conflicts).toHaveLength(0);
    expect(normalizeDoc(JSON.parse(JSON.stringify(doc))).guests).toHaveLength(doc.guests.length);
  });
});
