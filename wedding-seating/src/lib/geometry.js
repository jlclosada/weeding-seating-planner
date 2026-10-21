// Geometría de mesas en coordenadas de mundo (px a zoom 100 %). x, y de la mesa = centro.

export const SEAT_R = 15;
const SEAT_GAP = 7;
const SEAT_PITCH = SEAT_R * 2 + 7;
const RECT_DEPTH = 62;
const MARGIN = 36;

export function tableShape(table) {
  const cap = table.capacity;
  if (table.shape === 'rect') {
    const top = Math.ceil(cap / 2);
    const bottom = cap - top;
    const width = Math.max(130, top * SEAT_PITCH + 18);
    const seatY = RECT_DEPTH / 2 + SEAT_GAP + SEAT_R;
    const seats = [];
    for (let i = 0; i < top; i++) seats.push({ x: -width / 2 + ((i + 0.5) * width) / top, y: -seatY });
    for (let i = 0; i < bottom; i++) seats.push({ x: -width / 2 + ((i + 0.5) * width) / bottom, y: seatY });
    return {
      width,
      height: RECT_DEPTH,
      seats,
      halfW: width / 2 + (top === 1 ? SEAT_R : 0),
      halfH: seatY + SEAT_R,
    };
  }
  const base = 34 + Math.min(cap, 10) * 1.8;
  const ring = Math.max(base + SEAT_GAP + SEAT_R, (cap * SEAT_PITCH) / (2 * Math.PI));
  const radius = ring - SEAT_GAP - SEAT_R;
  const seats = Array.from({ length: cap }, (_, i) => {
    const a = (i / cap) * Math.PI * 2 - Math.PI / 2;
    return { x: Math.cos(a) * ring, y: Math.sin(a) * ring };
  });
  const half = ring + SEAT_R;
  return { width: radius * 2, height: radius * 2, seats, halfW: half, halfH: half };
}

export function tableBounds(table, margin = 0) {
  const { halfW, halfH } = tableShape(table);
  return { x0: table.x - halfW - margin, y0: table.y - halfH - margin, x1: table.x + halfW + margin, y1: table.y + halfH + margin };
}

const overlaps = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

export function contentBounds(tables) {
  if (!tables.length) return null;
  return tables.reduce(
    (acc, t) => {
      const b = tableBounds(t);
      return { x0: Math.min(acc.x0, b.x0), y0: Math.min(acc.y0, b.y0), x1: Math.max(acc.x1, b.x1), y1: Math.max(acc.y1, b.y1) };
    },
    { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity },
  );
}

/** Busca, en espiral alrededor de `near`, el primer hueco donde la mesa no pisa ninguna otra. */
export function findFreeSpot(tables, candidate, near = { x: 400, y: 300 }) {
  const step = 30;
  for (let ring = 0; ring < 60; ring++) {
    const points = ring === 0 ? [[0, 0]] : [];
    for (let i = -ring; i <= ring; i++) {
      points.push([i, -ring], [i, ring]);
      if (i !== -ring && i !== ring) points.push([-ring, i], [ring, i]);
    }
    // Preferimos llenar hacia la derecha/abajo, como se lee un plano.
    points.sort((a, b) => Math.hypot(a[0], a[1] * 1.3) - Math.hypot(b[0], b[1] * 1.3));
    for (const [dx, dy] of points) {
      const t = { ...candidate, x: near.x + dx * step, y: near.y + dy * step };
      const b = tableBounds(t, MARGIN / 2);
      if (!tables.some((o) => overlaps(b, tableBounds(o, MARGIN / 2)))) return { x: t.x, y: t.y };
    }
  }
  return { x: near.x, y: near.y };
}

/** Distribuye un conjunto de mesas nuevas en filas ordenadas (rectangulares arriba). */
export function layoutTables(specs, origin = { x: 0, y: 0 }) {
  const rects = specs.filter((t) => t.shape === 'rect');
  const rounds = specs.filter((t) => t.shape !== 'rect');
  const placed = [];
  let y = origin.y;

  const placeRow = (row) => {
    const shapes = row.map(tableShape);
    const rowWidth = shapes.reduce((s, sh) => s + sh.halfW * 2, 0) + MARGIN * (row.length - 1);
    const rowHalfH = Math.max(...shapes.map((sh) => sh.halfH));
    let x = origin.x - rowWidth / 2;
    y += rowHalfH;
    row.forEach((t, i) => {
      x += shapes[i].halfW;
      placed.push({ ...t, x, y });
      x += shapes[i].halfW + MARGIN;
    });
    y += rowHalfH + MARGIN;
  };

  const longRects = rects.filter((t) => t.capacity > 12);
  const shortRects = rects.filter((t) => t.capacity <= 12);
  if (shortRects.length) placeRow(shortRects);
  longRects.forEach((t) => placeRow([t]));
  const perRow = rounds.length <= 4 ? rounds.length : rounds.length <= 9 ? Math.ceil(rounds.length / 2) : 4;
  for (let i = 0; i < rounds.length; i += perRow) placeRow(rounds.slice(i, i + perRow));
  return placed;
}

export function seatWorldPosition(table, seat) {
  const p = tableShape(table).seats[seat];
  return p ? { x: table.x + p.x, y: table.y + p.y } : { x: table.x, y: table.y };
}
