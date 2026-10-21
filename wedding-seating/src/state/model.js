// Modelo de datos del planificador.
//
// doc = {
//   version, event: { title, date, venue },
//   tables: [{ id, name, shape: 'round' | 'rect', capacity, x, y }]   (x, y = centro)
//   guests: [{ id, name, groupId, tableId, seat, diet, note }]
//   groups: [{ id, name, color }]
//   avoid:  [[guestIdA, guestIdB]]   parejas que no deben compartir mesa
// }

export const DOC_VERSION = 2;

export const PALETTE = [
  '#C9785D', // terracota
  '#7E9A7A', // salvia
  '#6F8BA8', // azul polvo
  '#9A6E8F', // ciruela
  '#B8975A', // ocre
  '#C07A86', // rosa antiguo
  '#5E9690', // verde agua
  '#7D8494', // pizarra
  '#8F8F55', // oliva
  '#A86A4A', // siena
];

export const MIN_CAPACITY = 1;
export const MAX_CAPACITY = 30;

export const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const clampCapacity = (value, fallback = 10) => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < MIN_CAPACITY) return fallback;
  return Math.min(n, MAX_CAPACITY);
};

export const DEFAULT_GROUPS = [
  { id: 'family-bride', name: 'Familia novia', color: PALETTE[0] },
  { id: 'family-groom', name: 'Familia novio', color: PALETTE[1] },
  { id: 'friends', name: 'Amigos', color: PALETTE[2] },
  { id: 'work', name: 'Trabajo', color: PALETTE[3] },
  { id: 'other', name: 'Otros', color: PALETTE[4] },
];

export const RSVP = { pending: 'Pendiente', yes: 'Confirmado', no: 'No asiste' };

const DEFAULT_BUDGET = [
  ['Menú del banquete', 'Catering', 'guest', 95],
  ['Barra libre', 'Catering', 'guest', 25],
  ['Sillas', 'Mobiliario', 'guest', 5],
  ['Mantelería', 'Decoración', 'table', 15],
  ['Centros de mesa', 'Decoración', 'table', 30],
  ['Fotografía y vídeo', 'Servicios', 'fixed', 1500],
  ['Música / DJ', 'Servicios', 'fixed', 900],
];

const DEFAULT_TASKS = [
  ['Reservar el lugar', 'Lugar'],
  ['Contratar el catering', 'Catering'],
  ['Prueba de menú', 'Catering'],
  ['Enviar las invitaciones', 'Invitados'],
  ['Cerrar confirmaciones de asistencia', 'Invitados'],
  ['Contratar fotografía', 'Servicios'],
  ['Música / DJ', 'Servicios'],
  ['Flores y decoración', 'Decoración'],
  ['Cerrar el plano de mesas', 'Plano'],
  ['Imprimir el seating y las minutas', 'Plano'],
];

const DEFAULT_TIMELINE = [
  ['18:00', 'Llegada de invitados', 30],
  ['18:30', 'Ceremonia', 45],
  ['19:15', 'Cóctel', 60],
  ['20:15', 'Banquete', 120],
  ['22:15', 'Primer baile y fiesta', 180],
];

export const makeBudgetItem = ({ name = '', category = 'Otros', mode = 'fixed', unit = 0, qty = 1, paid = false } = {}) => ({ id: uid(), name, category, mode, unit, qty, paid });
export const makeTask = ({ title = '', category = 'General', due = '', done = false } = {}) => ({ id: uid(), title, category, due, done });
export const makeMoment = ({ time = '12:00', title = '', duration = 30, note = '' } = {}) => ({ id: uid(), time, title, duration, note });

const defaultBudget = () => DEFAULT_BUDGET.map(([name, category, mode, unit]) => makeBudgetItem({ name, category, mode, unit }));
const defaultTasks = () => DEFAULT_TASKS.map(([title, category]) => makeTask({ title, category }));
const defaultTimeline = () => DEFAULT_TIMELINE.map(([time, title, duration]) => makeMoment({ time, title, duration }));

export const createEmptyDoc = () => ({
  version: DOC_VERSION,
  event: { title: 'Nuestra boda', date: '', venue: '' },
  tables: [],
  guests: [],
  groups: DEFAULT_GROUPS.map((g) => ({ ...g })),
  avoid: [],
  budgetCap: null,
  budget: defaultBudget(),
  tasks: defaultTasks(),
  timeline: defaultTimeline(),
});

export const makeGuest = (name, groupId = null, extra = {}) => ({
  id: uid(),
  name: name.trim(),
  groupId,
  tableId: null,
  seat: null,
  diet: '',
  note: '',
  rsvp: 'pending',
  ...extra,
});

export const makeTable = ({ name, shape = 'round', capacity = 10, x = 0, y = 0 }) => ({
  id: uid(),
  name,
  shape: shape === 'rect' ? 'rect' : 'round',
  capacity: clampCapacity(capacity),
  x,
  y,
});

// Plantillas: solo crean mesas; nunca tocan invitados ni grupos.
export const TEMPLATES = [
  {
    id: 'classic',
    name: 'Banquete clásico',
    description: 'Mesa presidencial y 8 mesas redondas de 10',
    tables: [
      { name: 'Mesa presidencial', shape: 'rect', capacity: 8 },
      ...Array.from({ length: 8 }, (_, i) => ({ name: `Mesa ${i + 1}`, shape: 'round', capacity: 10 })),
    ],
  },
  {
    id: 'intimate',
    name: 'Boda íntima',
    description: 'Mesa presidencial y 4 mesas redondas de 8',
    tables: [
      { name: 'Mesa presidencial', shape: 'rect', capacity: 6 },
      ...Array.from({ length: 4 }, (_, i) => ({ name: `Mesa ${i + 1}`, shape: 'round', capacity: 8 })),
    ],
  },
  {
    id: 'imperial',
    name: 'Mesas imperiales',
    description: 'Tres mesas largas de 20 comensales',
    tables: Array.from({ length: 3 }, (_, i) => ({ name: `Imperial ${i + 1}`, shape: 'rect', capacity: 20 })),
  },
];

const OLD_PASTELS = [
  '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E0BBE4', '#FFDFD3', '#D4F1F4',
  '#C9E4CA', '#FEC8D8', '#E7FFAC', '#D5AAFF', '#B0E0E6', '#FFE4E1', '#F0E68C',
];
const PASTEL_TO_PALETTE = {
  '#FFB3BA': PALETTE[5], '#FFDFBA': PALETTE[4], '#FFFFBA': PALETTE[4], '#BAFFC9': PALETTE[1],
  '#BAE1FF': PALETTE[2], '#E0BBE4': PALETTE[3], '#FFDFD3': PALETTE[0], '#D4F1F4': PALETTE[6],
  '#C9E4CA': PALETTE[8], '#FEC8D8': PALETTE[5], '#E7FFAC': PALETTE[8], '#D5AAFF': PALETTE[3],
  '#B0E0E6': PALETTE[6], '#FFE4E1': PALETTE[9], '#F0E68C': PALETTE[4],
};

const isHex = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);

const migrateColor = (color, index) => {
  const key = typeof color === 'string' ? color.toUpperCase() : '';
  if (PASTEL_TO_PALETTE[key]) return PASTEL_TO_PALETTE[key];
  if (OLD_PASTELS.includes(key)) return PALETTE[index % PALETTE.length];
  return isHex(color) ? color : PALETTE[index % PALETTE.length];
};

/**
 * Convierte cualquier cosa razonable (formato v1 de 3 claves, v2, copia de seguridad
 * importada) en un documento v2 válido. Repara referencias rotas: invitados sentados
 * en mesas que ya no existen, asientos fuera de rango o duplicados y grupos borrados.
 */
export function normalizeDoc(raw) {
  const base = createEmptyDoc();
  if (!raw || typeof raw !== 'object') return base;

  const groups = Array.isArray(raw.groups) && raw.groups.length
    ? raw.groups
        .filter((g) => g && g.id != null)
        .map((g, i) => ({ id: g.id, name: String(g.name ?? 'Grupo').trim() || 'Grupo', color: migrateColor(g.color, i) }))
    : base.groups;
  const groupIds = new Set(groups.map((g) => g.id));

  const tables = (Array.isArray(raw.tables) ? raw.tables : [])
    .filter((t) => t && t.id != null)
    .map((t, i) => {
      const shape = t.shape === 'rect' || t.type === 'rectangular' ? 'rect' : 'round';
      const legacy = raw.version !== DOC_VERSION;
      // En v1 x/y era la esquina superior izquierda de la mesa (≈160 px de lado).
      const x = Number(t.x) + (legacy ? 90 : 0);
      const y = Number(t.y) + (legacy ? 90 : 0);
      return {
        id: t.id,
        name: String(t.name ?? `Mesa ${i + 1}`).trim() || `Mesa ${i + 1}`,
        shape,
        capacity: clampCapacity(t.capacity),
        x: Number.isFinite(x) ? x : 200 + i * 40,
        y: Number.isFinite(y) ? y : 200 + i * 40,
      };
    });
  const tableById = new Map(tables.map((t) => [t.id, t]));

  const taken = new Set();
  const guests = (Array.isArray(raw.guests) ? raw.guests : [])
    .filter((g) => g && g.id != null && String(g.name ?? '').trim())
    .map((g) => {
      const groupId = g.groupId ?? g.group ?? null;
      let tableId = g.tableId ?? null;
      let seat = g.seat ?? g.seatIndex ?? null;
      const table = tableById.get(tableId);
      const key = `${tableId}:${seat}`;
      if (!table || !Number.isInteger(seat) || seat < 0 || seat >= table.capacity || taken.has(key)) {
        tableId = null;
        seat = null;
      } else {
        taken.add(key);
      }
      return {
        id: g.id,
        name: String(g.name).trim(),
        groupId: groupIds.has(groupId) ? groupId : null,
        tableId,
        seat,
        diet: typeof g.diet === 'string' ? g.diet : '',
        rsvp: g.rsvp in RSVP ? g.rsvp : 'pending',
        note: typeof g.note === 'string' ? g.note : '',
      };
    });
  const guestIds = new Set(guests.map((g) => g.id));

  const avoid = (Array.isArray(raw.avoid) ? raw.avoid : [])
    .filter((p) => Array.isArray(p) && p.length === 2 && p[0] !== p[1] && guestIds.has(p[0]) && guestIds.has(p[1]));

  const event = { ...base.event, ...(raw.event && typeof raw.event === 'object' ? raw.event : {}) };

  const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const str = (v, d = '') => (typeof v === 'string' ? v : d);
  const budget = Array.isArray(raw.budget)
    ? raw.budget.filter((b) => b && b.id != null).map((b) => ({ id: b.id, name: str(b.name), category: str(b.category, 'Otros'), mode: ['guest', 'table', 'fixed'].includes(b.mode) ? b.mode : 'fixed', unit: Math.max(0, num(b.unit)), qty: Math.max(0, num(b.qty, 1)), paid: !!b.paid }))
    : base.budget;
  const tasks = Array.isArray(raw.tasks)
    ? raw.tasks.filter((t) => t && t.id != null).map((t) => ({ id: t.id, title: str(t.title), category: str(t.category, 'General'), due: str(t.due), done: !!t.done }))
    : base.tasks;
  const timeline = Array.isArray(raw.timeline)
    ? raw.timeline.filter((m) => m && m.id != null).map((m) => ({ id: m.id, time: /^\d{2}:\d{2}$/.test(m.time) ? m.time : '12:00', title: str(m.title), duration: Math.max(0, num(m.duration, 30)), note: str(m.note) }))
    : base.timeline;
  const budgetCap = raw.budgetCap == null || raw.budgetCap === '' ? null : Math.max(0, num(raw.budgetCap));

  return { version: DOC_VERSION, event, tables, guests, groups, avoid, budgetCap, budget, tasks, timeline };
}
