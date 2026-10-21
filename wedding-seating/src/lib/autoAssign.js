import { findFreeSpot } from './geometry';
import { makeTable } from '../state/model';

/**
 * Sienta a los invitados sin mesa respetando a los que ya están sentados.
 * - Mantiene juntos a los miembros de un mismo grupo (primero donde ya hay gente
 *   del grupo, luego la mesa en la que el grupo cabe más justo).
 * - Nunca sienta juntas a dos personas marcadas como "no sentar juntos" si hay alternativa.
 * - Si faltan asientos, crea mesas redondas de 10 en huecos libres.
 */
export function autoAssign(doc, { near } = {}) {
  const guests = doc.guests.map((g) => ({ ...g }));
  const tables = doc.tables.map((t) => ({ ...t }));
  const created = [];

  const occupied = new Map(tables.map((t) => [t.id, new Set()]));
  const members = new Map(tables.map((t) => [t.id, []]));
  for (const g of guests) {
    if (g.tableId != null && occupied.has(g.tableId)) {
      occupied.get(g.tableId).add(g.seat);
      members.get(g.tableId).push(g);
    }
  }

  const avoid = new Map();
  for (const [a, b] of doc.avoid ?? []) {
    if (!avoid.has(a)) avoid.set(a, new Set());
    if (!avoid.has(b)) avoid.set(b, new Set());
    avoid.get(a).add(b);
    avoid.get(b).add(a);
  }
  const clashes = (guest, tableId) => members.get(tableId).some((m) => avoid.get(guest.id)?.has(m.id));
  const free = (t) => t.capacity - occupied.get(t.id).size;

  const seatGuest = (guest, table) => {
    let seat = 0;
    while (occupied.get(table.id).has(seat)) seat++;
    guest.tableId = table.id;
    guest.seat = seat;
    occupied.get(table.id).add(seat);
    members.get(table.id).push(guest);
  };

  const createTable = () => {
    const spec = { shape: 'round', capacity: 10 };
    const pos = findFreeSpot(tables, spec, near);
    const table = makeTable({ ...spec, name: `Mesa ${tables.length + 1}`, ...pos });
    tables.push(table);
    created.push(table);
    occupied.set(table.id, new Set());
    members.set(table.id, []);
    return table;
  };

  const buckets = new Map();
  for (const g of guests) {
    if (g.tableId != null) continue;
    const key = g.groupId ?? '__none__';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(g);
  }
  const order = [...buckets.entries()].sort((a, b) => b[1].length - a[1].length);

  let seated = 0;
  for (const [groupKey, pending] of order) {
    const excluded = new Set();
    let guard = 0;
    while (pending.length && guard++ < 1000) {
      const open = tables.filter((t) => free(t) > 0 && !excluded.has(t.id));
      const withGroup = open
        .map((t) => [t, members.get(t.id).filter((m) => (m.groupId ?? '__none__') === groupKey).length])
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1]);
      let table = withGroup[0]?.[0];
      if (!table) {
        const fits = open.filter((t) => free(t) >= pending.length).sort((a, b) => free(a) - free(b));
        table = fits[0] ?? open.sort((a, b) => free(b) - free(a))[0];
      }
      if (!table) table = createTable();

      let placedHere = 0;
      for (let i = 0; i < pending.length && free(table) > 0; ) {
        if (clashes(pending[i], table.id)) {
          i++;
          continue;
        }
        seatGuest(pending[i], table);
        pending.splice(i, 1);
        placedHere++;
        seated++;
      }
      if (!placedHere) excluded.add(table.id);
      // Si todas las mesas abiertas chocan con alguien, se necesita una mesa nueva.
      if (pending.length && tables.every((t) => free(t) === 0 || excluded.has(t.id))) {
        excluded.clear();
        const fresh = createTable();
        for (let i = 0; i < pending.length && free(fresh) > 0; ) {
          if (clashes(pending[i], fresh.id)) {
            i++;
            continue;
          }
          seatGuest(pending[i], fresh);
          pending.splice(i, 1);
          seated++;
        }
      }
    }
  }

  return { guests, tables, created, seated };
}

/** Avisos sobre el plano: incompatibilidades, mesas sobrecargadas, grupos dispersos. */
export function analyze(doc) {
  const byTable = new Map(doc.tables.map((t) => [t.id, []]));
  for (const g of doc.guests) if (g.tableId != null && byTable.has(g.tableId)) byTable.get(g.tableId).push(g);
  const guestById = new Map(doc.guests.map((g) => [g.id, g]));
  const tableById = new Map(doc.tables.map((t) => [t.id, t]));

  const conflicts = [];
  for (const [a, b] of doc.avoid ?? []) {
    const ga = guestById.get(a);
    const gb = guestById.get(b);
    if (ga && gb && ga.tableId != null && ga.tableId === gb.tableId) {
      conflicts.push({ tableId: ga.tableId, a: ga, b: gb, table: tableById.get(ga.tableId) });
    }
  }

  const scattered = [];
  for (const group of doc.groups) {
    const seated = doc.guests.filter((g) => g.groupId === group.id && g.tableId != null);
    const tableCount = new Set(seated.map((g) => g.tableId)).size;
    const ideal = Math.ceil(seated.length / 10);
    if (seated.length >= 4 && tableCount > ideal + 2) scattered.push({ group, tables: tableCount, guests: seated.length });
  }

  const empty = doc.tables.filter((t) => byTable.get(t.id).length === 0);
  return { conflicts, scattered, empty, byTable };
}
