import { useCallback, useEffect, useRef, useState } from 'react';

const LONG_PRESS_MS = 220;
const TOUCH_SLOP = 10;
const EDGE = 56;
const EDGE_DWELL_MS = 300;

const sameTarget = (a, b) => a === b || (a && b && a.list === b.list && a.tableId === b.tableId && a.seat === b.seat);

function targetAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const seat = el?.closest('[data-seat]');
  if (seat) return { tableId: seat.dataset.tableId, seat: Number(seat.dataset.seat) };
  if (el?.closest('[data-dropzone="list"]')) return { list: true };
  return null;
}

/**
 * Arrastre de invitados para ratón y táctil.
 * - Ratón: basta con mover 5 px.
 * - Táctil: mantener pulsado ~0,2 s (si el dedo se mueve antes, se deja hacer scroll normal).
 * Mientras se arrastra, el plano se desplaza solo al acercarse a los bordes.
 */
export function useGuestDrag({ canvas, onDrop }) {
  const [drag, setDrag] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const ghostRef = useRef(null);
  const dragging = useRef(false);
  const state = useRef({ x: 0, y: 0, target: null, raf: 0 });
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  const placeGhost = () => {
    const s = state.current;
    if (ghostRef.current) ghostRef.current.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -125%)`;
  };

  const retarget = useCallback(() => {
    const s = state.current;
    const next = targetAt(s.x, s.y);
    if (!sameTarget(next, s.target)) {
      s.target = next;
      setDropTarget(next);
      if (next?.seat != null) navigator.vibrate?.(4);
    }
  }, []);

  // Bucle de autodesplazamiento cerca de los bordes del plano.
  const autoPan = useCallback(() => {
    const s = state.current;
    cancelAnimationFrame(s.raf);
    let prev = performance.now();
    const step = (now) => {
      if (!dragging.current) return;
      const dt = Math.min(48, now - prev) / 1000;
      prev = now;
      const rect = canvas.current?.getRect();
      if (rect) {
        // Hasta ~420 px/s, más rápido cuanto más cerca del borde e independiente de los Hz de la pantalla.
        const speed = (d) => (d < EDGE ? ((EDGE - Math.max(0, d)) / EDGE) * 420 * dt : 0);
        const dx = speed(s.x - rect.left) - speed(rect.right - s.x);
        const dy = speed(s.y - rect.top) - speed(rect.bottom - s.y);
        const inside = s.x >= rect.left && s.x <= rect.right && s.y >= rect.top && s.y <= rect.bottom;
        // Solo si el dedo se queda junto al borde: cruzarlo de camino a una silla no mueve el plano.
        if (inside && (dx || dy)) {
          s.edgeSince ??= performance.now();
          if (performance.now() - s.edgeSince > EDGE_DWELL_MS) {
            canvas.current.panBy(dx, dy);
            retarget();
          }
        } else {
          s.edgeSince = null;
        }
      }
      s.raf = requestAnimationFrame(step);
    };
    s.raf = requestAnimationFrame(step);
  }, [canvas, retarget]);

  const begin = useCallback(
    (guestId, x, y) => {
      dragging.current = true;
      Object.assign(state.current, { x, y, target: null, edgeSince: null });
      setDrag({ guestId, x, y });
      document.body.classList.add('is-dragging');
      autoPan();
    },
    [autoPan],
  );

  const move = useCallback(
    (x, y) => {
      state.current.x = x;
      state.current.y = y;
      placeGhost();
      retarget();
    },
    [retarget],
  );

  const end = useCallback((guestId, cancelled = false) => {
    const s = state.current;
    cancelAnimationFrame(s.raf);
    dragging.current = false;
    document.body.classList.remove('is-dragging');
    if (!cancelled && s.target) onDropRef.current(guestId, s.target);
    s.target = null;
    setDrag(null);
    setDropTarget(null);
  }, []);

  useEffect(() => placeGhost(), [drag]);

  const startMouse = useCallback(
    (e, guestId) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      const sx = e.clientX;
      const sy = e.clientY;
      let active = false;
      const onMove = (ev) => {
        if (!active) {
          if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
          active = true;
          begin(guestId, ev.clientX, ev.clientY);
        }
        move(ev.clientX, ev.clientY);
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        if (!active) return;
        // El clic que sigue a soltar no debe interpretarse como un toque.
        const swallow = (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        window.addEventListener('click', swallow, { capture: true, once: true });
        setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
        end(guestId);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [begin, move, end],
  );

  const startTouch = useCallback(
    (e, guestId) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const sx = t.clientX;
      const sy = t.clientY;
      let active = false;
      let last = { x: sx, y: sy };
      const timer = setTimeout(() => {
        active = true;
        navigator.vibrate?.(12);
        begin(guestId, last.x, last.y);
      }, LONG_PRESS_MS);
      const onMove = (ev) => {
        const p = ev.touches[0];
        last = { x: p.clientX, y: p.clientY };
        if (!active) {
          // Se ha movido antes de tiempo: es un scroll, no un arrastre.
          if (Math.hypot(p.clientX - sx, p.clientY - sy) > TOUCH_SLOP) cleanup();
          return;
        }
        ev.preventDefault();
        move(p.clientX, p.clientY);
      };
      const onEnd = (ev) => {
        const wasActive = active;
        cleanup();
        if (wasActive) {
          ev.preventDefault();
          end(guestId, ev.type === 'touchcancel');
        }
      };
      const cleanup = () => {
        clearTimeout(timer);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
        document.removeEventListener('touchcancel', onEnd);
      };
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onEnd, { passive: false });
      document.addEventListener('touchcancel', onEnd, { passive: false });
    },
    [begin, move, end],
  );

  return { drag, dropTarget, ghostRef, dragging, startMouse, startTouch };
}
