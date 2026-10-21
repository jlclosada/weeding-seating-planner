import { clampCapacity, normalizeDoc, uid } from './model';

const HISTORY_LIMIT = 150;

const unseat = (g) => ({ ...g, tableId: null, seat: null });

function docReducer(doc, action) {
  switch (action.type) {
    case 'event/update':
      return { ...doc, event: { ...doc.event, ...action.patch } };

    case 'table/add':
      return { ...doc, tables: [...doc.tables, ...[].concat(action.table)] };

    case 'table/update': {
      const patch = { ...action.patch };
      if ('capacity' in patch) patch.capacity = clampCapacity(patch.capacity);
      if ('name' in patch) patch.name = String(patch.name);
      const tables = doc.tables.map((t) => (t.id === action.id ? { ...t, ...patch } : t));
      const table = tables.find((t) => t.id === action.id);
      const guests = doc.guests.map((g) => (g.tableId === action.id && g.seat >= table.capacity ? unseat(g) : g));
      return { ...doc, tables, guests };
    }

    case 'table/move':
      return { ...doc, tables: doc.tables.map((t) => (t.id === action.id ? { ...t, x: action.x, y: action.y } : t)) };

    case 'table/delete':
      return {
        ...doc,
        tables: doc.tables.filter((t) => t.id !== action.id),
        guests: doc.guests.map((g) => (g.tableId === action.id ? unseat(g) : g)),
      };

    case 'table/clearSeats':
      return { ...doc, guests: doc.guests.map((g) => (g.tableId === action.id ? unseat(g) : g)) };

    case 'tables/replace':
      return { ...doc, tables: action.tables, guests: doc.guests.map(unseat) };

    case 'guests/add':
      return { ...doc, groups: [...doc.groups, ...(action.groups ?? [])], guests: [...doc.guests, ...action.guests] };

    case 'guest/save': {
      const next = docReducer(doc, { type: 'guest/update', id: action.id, patch: action.patch });
      return action.avoid ? docReducer(next, { type: 'avoid/set', guestId: action.id, otherIds: action.avoid }) : next;
    }

    case 'guest/update':
      return {
        ...doc,
        guests: doc.guests.map((g) => (g.id === action.id ? { ...g, ...action.patch, name: (action.patch.name ?? g.name).trim() || g.name } : g)),
      };

    case 'guests/delete': {
      const ids = new Set([].concat(action.ids));
      return {
        ...doc,
        guests: doc.guests.filter((g) => !ids.has(g.id)),
        avoid: doc.avoid.filter(([a, b]) => !ids.has(a) && !ids.has(b)),
      };
    }

    case 'seat/assign': {
      const { guestId, tableId, seat } = action;
      const mover = doc.guests.find((g) => g.id === guestId);
      const table = doc.tables.find((t) => t.id === tableId);
      if (!mover || !table || seat < 0 || seat >= table.capacity) return doc;
      const occupant = doc.guests.find((g) => g.tableId === tableId && g.seat === seat && g.id !== guestId);
      return {
        ...doc,
        guests: doc.guests.map((g) => {
          if (g.id === guestId) return { ...g, tableId, seat };
          // Intercambio: quien ocupaba el asiento pasa al sitio del que llega (o a la lista).
          if (occupant && g.id === occupant.id) return { ...g, tableId: mover.tableId, seat: mover.seat };
          return g;
        }),
      };
    }

    case 'seat/assignAny': {
      const table = doc.tables.find((t) => t.id === action.tableId);
      if (!table) return doc;
      const taken = new Set(doc.guests.filter((g) => g.tableId === table.id && g.id !== action.guestId).map((g) => g.seat));
      let seat = 0;
      while (taken.has(seat)) seat++;
      if (seat >= table.capacity) return doc;
      return { ...doc, guests: doc.guests.map((g) => (g.id === action.guestId ? { ...g, tableId: table.id, seat } : g)) };
    }

    case 'seat/unassign':
      return { ...doc, guests: doc.guests.map((g) => (g.id === action.guestId ? unseat(g) : g)) };

    case 'seats/clearAll':
      return { ...doc, guests: doc.guests.map(unseat) };

    case 'seats/apply':
      return { ...doc, guests: action.guests, tables: action.tables };

    case 'group/add':
      return { ...doc, groups: [...doc.groups, { id: action.id ?? uid(), name: action.name.trim(), color: action.color }] };

    case 'group/update':
      return { ...doc, groups: doc.groups.map((g) => (g.id === action.id ? { ...g, ...action.patch } : g)) };

    case 'group/delete':
      return {
        ...doc,
        groups: doc.groups.filter((g) => g.id !== action.id),
        guests: doc.guests.map((g) => (g.groupId === action.id ? { ...g, groupId: null } : g)),
      };

    case 'avoid/set': {
      const others = new Set(action.otherIds.filter((id) => id !== action.guestId));
      const kept = doc.avoid.filter(([a, b]) => a !== action.guestId && b !== action.guestId);
      return { ...doc, avoid: [...kept, ...[...others].map((o) => [action.guestId, o])] };
    }

    case 'doc/replace':
      return normalizeDoc(action.doc);

    default:
      return doc;
  }
}

/** Acciones que no generan un paso propio de historial (arrastres en curso). */
const TRANSIENT = new Set(['table/move']);

export function initHistory(doc) {
  return { doc, past: [], future: [], label: null };
}

export function historyReducer(state, action) {
  switch (action.type) {
    case 'history/undo': {
      if (!state.past.length) return state;
      const prev = state.past[state.past.length - 1];
      return { doc: prev.doc, past: state.past.slice(0, -1), future: [{ doc: state.doc, label: prev.label }, ...state.future], label: prev.label };
    }
    case 'history/redo': {
      if (!state.future.length) return state;
      const [next, ...rest] = state.future;
      return { doc: next.doc, past: [...state.past, { doc: state.doc, label: next.label }], future: rest, label: next.label };
    }
    case 'history/checkpoint':
      return { ...state, past: [...state.past, { doc: state.doc, label: action.label }].slice(-HISTORY_LIMIT), future: [] };
    default: {
      const doc = docReducer(state.doc, action);
      if (doc === state.doc) return state;
      if (TRANSIENT.has(action.type) || action.skipHistory) return { ...state, doc };
      return {
        doc,
        past: [...state.past, { doc: state.doc, label: action.label ?? null }].slice(-HISTORY_LIMIT),
        future: [],
        label: action.label ?? null,
      };
    }
  }
}

