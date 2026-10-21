import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Maximize, Minus, Plus } from 'lucide-react';
import TableNode from './TableNode';
import { contentBounds, tableBounds } from '../lib/geometry';
import { normalize } from '../lib/text';

const MIN_K = 0.2;
const MAX_K = 2.5;
const clampK = (k) => Math.min(MAX_K, Math.max(MIN_K, k));

export default function Canvas({
  ref,
  tables,
  seatsByTable,
  groupColor,
  selectedTableId,
  conflictTables,
  dropTarget,
  picking,
  query,
  dispatch,
  onSeatClick,
  onSeatPointerDown,
  onSeatTouchStart,
  suspendRef,
  onTableSelect,
  onBackgroundClick,
  insets = { top: 0, right: 0, bottom: 0, left: 0 },
  children,
}) {
  const el = useRef(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const tablesRef = useRef(tables);
  tablesRef.current = tables;
  const insetsRef = useRef(insets);
  insetsRef.current = insets;
  const gesture = useRef(null);
  const pointers = useRef(new Map());
  const suppressClick = useRef(false);
  const frame = useRef(0);
  const fitted = useRef(false);
  const [movingId, setMovingId] = useState(null);

  const fit = useCallback((animate = true) => {
    const node = el.current;
    if (!node) return;
    const { width, height } = node.getBoundingClientRect();
    const ins = insetsRef.current;
    const w = width - ins.left - ins.right;
    const h = height - ins.top - ins.bottom;
    const b = contentBounds(tablesRef.current);
    if (!b) {
      setView({ x: ins.left + w / 2 - 600, y: ins.top + 60, k: 1 });
      return;
    }
    const pad = w < 500 ? 16 : 48;
    const fitK = Math.min((w - pad * 2) / (b.x1 - b.x0), (h - pad * 2) / (b.y1 - b.y0), 1.15);
    // En pantallas estrechas no bajamos de un zoom legible: mejor desplazarse que no leer nada.
    const k = clampK(Math.max(fitK, w < 500 ? 0.55 : 0));
    const contentH = (b.y1 - b.y0) * k;
    const y = contentH > h - pad * 2 ? ins.top + pad - b.y0 * k : ins.top + (h - contentH) / 2 - b.y0 * k;
    setView({ anim: animate, k, x: ins.left + (w - (b.x1 - b.x0) * k) / 2 - b.x0 * k, y });
  }, []);

  const zoomAt = useCallback((cx, cy, factor, animate = false) => {
    const node = el.current;
    const rect = node.getBoundingClientRect();
    const v = viewRef.current;
    const px = cx - rect.left;
    const py = cy - rect.top;
    const k = clampK(v.k * factor);
    setView({ anim: animate, k, x: px - ((px - v.x) / v.k) * k, y: py - ((py - v.y) / v.k) * k });
  }, []);

  const zoomBy = useCallback(
    (factor) => {
      const rect = el.current.getBoundingClientRect();
      const ins = insetsRef.current;
      zoomAt(rect.left + ins.left + (rect.width - ins.left - ins.right) / 2, rect.top + ins.top + (rect.height - ins.top - ins.bottom) / 2, factor, true);
    },
    [zoomAt],
  );

  const centerOn = useCallback((table) => {
    const node = el.current;
    if (!node || !table) return;
    const { width, height } = node.getBoundingClientRect();
    const ins = insetsRef.current;
    const v = viewRef.current;
    const k = Math.max(v.k, 0.75);
    setView({ anim: true, k, x: ins.left + (width - ins.left - ins.right) / 2 - table.x * k, y: ins.top + (height - ins.top - ins.bottom) / 2 - table.y * k });
  }, []);

  /** Punto del mundo en el centro de la zona visible: aquí aparecen las mesas nuevas. */
  const viewCenter = useCallback(() => {
    const node = el.current;
    const v = viewRef.current;
    if (!node) return { x: 600, y: 300 };
    const { width, height } = node.getBoundingClientRect();
    const ins = insetsRef.current;
    return { x: (ins.left + (width - ins.left - ins.right) / 2 - v.x) / v.k, y: (ins.top + (height - ins.top - ins.bottom) / 2 - v.y) / v.k };
  }, []);

  /** Si una mesa queda fuera de la vista, la trae a la vista. */
  const reveal = useCallback(
    (table) => {
      const node = el.current;
      if (!node || !table) return;
      const { width, height } = node.getBoundingClientRect();
      const v = viewRef.current;
      const b = tableBounds(table);
      const ins = insetsRef.current;
      const inside = b.x0 * v.k + v.x >= ins.left && b.x1 * v.k + v.x <= width - ins.right && b.y0 * v.k + v.y >= ins.top && b.y1 * v.k + v.y <= height - ins.bottom;
      if (!inside) centerOn(table);
    },
    [centerOn],
  );

  const panBy = useCallback((dx, dy) => setView((v) => ({ ...v, anim: false, x: v.x + dx, y: v.y + dy })), []);
  // Zona visible del plano (sin la parte tapada por la hoja inferior en móvil).
  const getRect = useCallback(() => {
    const r = el.current?.getBoundingClientRect();
    if (!r) return null;
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom - insetsRef.current.bottom + 24 };
  }, []);

  useImperativeHandle(ref, () => ({ fit, zoomBy, centerOn, viewCenter, reveal, panBy, getRect }), [fit, zoomBy, centerOn, viewCenter, reveal, panBy, getRect]);

  useLayoutEffect(() => {
    if (!fitted.current) {
      fitted.current = true;
      fit(false);
    }
  }, [fit]);

  // Rueda: con Ctrl/⌘ (o pellizco en trackpad) hace zoom; sin modificador desplaza.
  useEffect(() => {
    const node = el.current;
    const onWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0075));
      else {
        const v = viewRef.current;
        setView({ ...v, anim: false, x: v.x - e.deltaX, y: v.y - e.deltaY });
      }
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    const v = viewRef.current;
    const rect = el.current.getBoundingClientRect();
    const mid = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
    clearTimeout(gesture.current?.timer);
    gesture.current = { type: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y), k: v.k, world: { x: (mid.x - v.x) / v.k, y: (mid.y - v.y) / v.k }, moved: true };
  };

  const onPointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) return startPinch();
    const v = viewRef.current;
    // Solo es "clic en el fondo" si se pulsó fuera de mesas y asientos.
    gesture.current = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: v.x, vy: v.y, moved: false, background: !e.target.closest('[data-table]') };
  };

  const onTablePointerDown = useCallback(
    (e, table) => {
      e.stopPropagation();
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2) return startPinch();
      const v = viewRef.current;
      const base = { id: table.id, sx: e.clientX, sy: e.clientY, ox: table.x, oy: table.y, vx: v.x, vy: v.y, moved: false };
      if (e.pointerType === 'touch') {
        // En táctil, mantener pulsado 250 ms para mover la mesa; si se desliza antes, se desplaza el plano.
        const g = { ...base, type: 'table-pending' };
        g.timer = setTimeout(() => {
          if (gesture.current === g) {
            g.type = 'table';
            navigator.vibrate?.(12);
            setMovingId(table.id);
            onTableSelect(table.id);
          }
        }, 300);
        gesture.current = g;
      } else {
        gesture.current = { ...base, type: 'table' };
      }
    },
    [onTableSelect],
  );

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    // Mientras se arrastra un invitado, el dedo no debe mover el plano.
    if (suspendRef?.current && g.type !== 'pinch') {
      clearTimeout(g.timer);
      gesture.current = null;
      return;
    }
    if (g.type === 'pinch') {
      if (pointers.current.size < 2) return;
      const [a, b] = [...pointers.current.values()];
      const rect = el.current.getBoundingClientRect();
      const mid = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
      const k = clampK((g.k * Math.hypot(a.x - b.x, a.y - b.y)) / g.dist);
      setView({ anim: false, k, x: mid.x - g.world.x * k, y: mid.y - g.world.y * k });
      return;
    }
    const dx = e.clientX - g.sx;
    const dy = e.clientY - g.sy;
    const threshold = e.pointerType === 'touch' ? 8 : 3;
    if (!g.moved && Math.hypot(dx, dy) < threshold) return;
    if (g.type === 'table-pending') {
      clearTimeout(g.timer);
      g.type = 'pan';
    }
    if (!g.moved && g.type === 'table') {
      dispatch({ type: 'history/checkpoint', label: 'Mover mesa' });
      setMovingId(g.id);
    }
    // Capturamos el puntero solo al empezar a arrastrar: así los clics en asientos siguen llegando.
    if (!g.moved) {
      try {
        el.current.setPointerCapture(e.pointerId);
      } catch {
        // Puntero no capturable (p. ej. ya liberado): seguimos sin captura.
      }
    }
    g.moved = true;
    if (g.type === 'pan') {
      setView((v) => ({ ...v, anim: false, x: g.vx + dx, y: g.vy + dy }));
    } else if (g.type === 'table') {
      const k = viewRef.current.k;
      g.next = { x: Math.round(g.ox + dx / k), y: Math.round(g.oy + dy / k) };
      if (!frame.current) {
        frame.current = requestAnimationFrame(() => {
          frame.current = 0;
          if (g.next) dispatch({ type: 'table/move', id: g.id, ...g.next });
        });
      }
    }
  };

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (!g) return;
    if (g.type === 'pinch') {
      if (pointers.current.size === 0) gesture.current = null;
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 0);
      return;
    }
    clearTimeout(g.timer);
    gesture.current = null;
    setMovingId(null);
    if (g.moved) {
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 0);
      if (g.type === 'table') onTableSelect(g.id);
      return;
    }
    if (g.type === 'table' || g.type === 'table-pending') onTableSelect(g.id);
    else if (g.type === 'pan' && g.background) onBackgroundClick();
  };

  const handleSeatClick = useCallback(
    (e, table, seat, guest) => {
      e.stopPropagation();
      if (suppressClick.current) return;
      onSeatClick(table, seat, guest);
    },
    [onSeatClick],
  );

  const handleSeatPointerDown = useCallback(
    (e, guestId) => {
      if (e.pointerType === 'mouse') {
        e.stopPropagation();
        onSeatPointerDown(e, guestId);
      }
    },
    [onSeatPointerDown],
  );

  const handlers = useMemo(
    () => ({ onTablePointerDown, onTableSelect, onSeatClick: handleSeatClick, onSeatPointerDown: handleSeatPointerDown, onSeatTouchStart }),
    [onTablePointerDown, onTableSelect, handleSeatClick, handleSeatPointerDown, onSeatTouchStart],
  );

  const matches = useMemo(() => {
    const q = normalize(query);
    if (!q) return null;
    const set = new Set();
    for (const seated of seatsByTable.values()) for (const g of seated) if (g && normalize(g.name).includes(q)) set.add(g.id);
    return set;
  }, [query, seatsByTable]);

  const grid = 22 * view.k;

  return (
    <div
      ref={el}
      className="canvas-bg relative h-full w-full touch-none select-none overflow-hidden outline-none"
      style={{ backgroundSize: `${grid}px ${grid}px`, backgroundPosition: `${view.x}px ${view.y}px` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      data-canvas
    >
      <div
        className="absolute left-0 top-0 origin-top-left data-[animate='1']:transition-transform data-[animate='1']:duration-300"
        data-animate={view.anim ? '1' : undefined}
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, '--inv-k': Math.min(2.2, 1 / view.k) }}
      >
        {tables.map((t) => (
          <TableNode
            key={t.id}
            table={t}
            seated={seatsByTable.get(t.id)}
            groupColor={groupColor}
            selected={selectedTableId === t.id}
            lifted={movingId === t.id}
            conflict={conflictTables.has(t.id)}
            targetSeat={dropTarget && dropTarget.tableId === String(t.id) ? dropTarget.seat : -1}
            picking={picking}
            matches={matches}
            dimmed={matches ? !seatsByTable.get(t.id).some((g) => g && matches.has(g.id)) : false}
            handlers={handlers}
          />
        ))}
      </div>

      {children}

      <div className="absolute right-3 z-20 flex flex-col overflow-hidden rounded-xl border border-line bg-card shadow-float lg:hidden" style={{ bottom: insets.bottom + 12 }} onPointerDown={(e) => e.stopPropagation()}>
        <button className="flex h-10 w-10 items-center justify-center text-ink-2 active:bg-paper" onClick={() => zoomBy(1.25)} aria-label="Acercar">
          <Plus size={17} />
        </button>
        <button className="flex h-10 w-10 items-center justify-center border-y border-line text-ink-2 active:bg-paper" onClick={() => zoomBy(1 / 1.25)} aria-label="Alejar">
          <Minus size={17} />
        </button>
        <button className="flex h-10 w-10 items-center justify-center text-ink-2 active:bg-paper" onClick={() => fit()} aria-label="Encajar el plano">
          <Maximize size={16} />
        </button>
      </div>

      <div className="absolute bottom-5 right-5 z-20 hidden items-center rounded-xl border border-line bg-card p-1 shadow-float lg:flex" style={{ right: 20 + insets.right }} onPointerDown={(e) => e.stopPropagation()}>
        <button className="icon-btn h-8 w-8 border-transparent" onClick={() => zoomBy(1 / 1.2)} aria-label="Alejar">
          <Minus size={15} />
        </button>
        <button className="min-w-[52px] text-center text-[12.5px] font-medium text-ink" onClick={() => fit()} title="Encajar el plano">
          {Math.round(view.k * 100)}%
        </button>
        <button className="icon-btn h-8 w-8 border-transparent" onClick={() => zoomBy(1.2)} aria-label="Acercar">
          <Plus size={15} />
        </button>
        <span className="mx-1 h-5 w-px bg-line" />
        <button className="icon-btn h-8 w-8 border-transparent" onClick={() => fit()} aria-label="Encajar el plano en pantalla" title="Encajar (F)">
          <Maximize size={15} />
        </button>
      </div>
    </div>
  );
}
