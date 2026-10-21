import { memo } from 'react';
import { SEAT_R, tableShape } from '../lib/geometry';
import { tone } from '../lib/colors';
import { initials } from '../lib/text';

/**
 * Una mesa en el plano. Se memoriza: solo se vuelve a pintar cuando cambia su
 * propia mesa, sus comensales o el estado visual que le afecta.
 */
function TableNode({ table, seated, groupColor, selected, lifted, conflict, targetSeat, picking, matches, dimmed, handlers }) {
  const shape = tableShape(table);
  const { halfW, halfH } = shape;
  const filled = seated.filter(Boolean).length;
  const full = filled === table.capacity;
  const nameSize = table.shape === 'rect' ? 19 : Math.max(15, Math.min(21, shape.width / 5.2));

  return (
    <div
      className={`absolute transition-transform duration-200 ${lifted ? 'z-10 scale-[1.04]' : ''}`}
      style={{ left: table.x - halfW, top: table.y - halfH, width: halfW * 2, height: halfH * 2 }}
      data-table={String(table.id)}
    >
      {selected && (
        <div
          className="pointer-events-none absolute border border-dashed border-gold"
          style={
            table.shape === 'rect'
              ? { inset: -10, borderRadius: 18 }
              : { inset: -10, borderRadius: '50%' }
          }
        />
      )}
      <div
        role="button"
        tabIndex={0}
        aria-label={`${table.name}, ${filled} de ${table.capacity} asientos ocupados`}
        aria-pressed={selected}
        onPointerDown={(e) => handlers.onTablePointerDown(e, table)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handlers.onTableSelect(table.id)}
        className={`absolute flex cursor-grab touch-none select-none flex-col items-center justify-center border bg-card text-center transition-[border-color,box-shadow] active:cursor-grabbing ${
          lifted ? 'border-gold shadow-[0_26px_50px_-18px_rgba(90,60,20,0.55)]' : selected ? 'border-gold shadow-[0_10px_28px_-12px_rgba(120,90,40,0.45)]' : 'border-line-2 shadow-[0_8px_22px_-14px_rgba(90,66,40,0.4)] hover:border-[#bba98c]'
        } ${table.shape === 'rect' ? 'rounded-[10px]' : 'rounded-full'} ${dimmed ? 'opacity-50' : ''}`}
        style={{ left: halfW - shape.width / 2, top: halfH - shape.height / 2, width: shape.width, height: shape.height }}
      >
        {table.shape !== 'rect' && <span className="pointer-events-none absolute inset-[6px] rounded-full border border-[#efe6d6]" />}
        <span className="pointer-events-none max-w-[86%] truncate font-serif italic leading-none text-ink" style={{ fontSize: nameSize }}>
          {table.name}
        </span>
        <span className={`pointer-events-none mt-1.5 text-[10px] tracking-[0.1em] ${full ? 'text-ok' : 'text-ink-3'}`}>
          {filled} / {table.capacity}
        </span>
        {conflict && (
          <span
            className="pointer-events-none absolute flex h-[18px] w-[18px] items-center justify-center rounded-full bg-danger text-[11px] font-bold text-white"
            style={table.shape === 'rect' ? { right: -6, top: -6 } : { right: '8%', top: '8%' }}
            title="Hay personas que no deberían sentarse juntas"
          >
            !
          </span>
        )}
      </div>

      {shape.seats.map((p, i) => {
        const guest = seated[i];
        const t = guest ? tone(groupColor.get(guest.groupId)) : null;
        const isTarget = targetSeat === i;
        const faded = matches && guest && !matches.has(guest.id);
        const hit = matches && guest && matches.has(guest.id);
        return (
          <button
            key={`${i}-${guest?.id ?? 'libre'}`}
            type="button"
            data-seat={i}
            data-table-id={String(table.id)}
            onPointerDown={guest ? (e) => handlers.onSeatPointerDown(e, guest.id) : undefined}
            onTouchStart={guest ? (e) => handlers.onSeatTouchStart(e, guest.id) : undefined}
            onContextMenu={(e) => e.preventDefault()}
            onClick={(e) => handlers.onSeatClick(e, table, i, guest)}
            aria-label={guest ? `${guest.name}, asiento ${i + 1} de ${table.name}` : `Asiento libre ${i + 1} de ${table.name}`}
            className={`seat group absolute flex items-center justify-center rounded-full font-semibold ${guest ? 'seat-pop' : ''} ${isTarget ? 'seat-target' : ''} ${
              guest ? 'border-[1.5px] hover:scale-110' : `border border-dashed ${picking ? 'border-gold bg-gold-soft hover:scale-110' : 'border-line-2 bg-card'}`
            } ${faded ? 'opacity-25' : ''} ${hit ? 'z-10 scale-125 shadow-[0_0_0_3px_var(--card),0_0_0_5px_var(--gold)]' : ''}`}
            style={{
              left: halfW + p.x - SEAT_R,
              top: halfH + p.y - SEAT_R,
              width: SEAT_R * 2,
              height: SEAT_R * 2,
              fontSize: 10.5,
              ...(t ? { backgroundColor: t.bg, borderColor: t.border, color: t.fg } : null),
            }}
          >
            {guest ? initials(guest.name) : null}
            {guest && (
              <span
                className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11.5px] font-medium text-paper shadow-float group-hover:block"
                style={{ transform: 'translateX(-50%) scale(var(--inv-k, 1))', transformOrigin: 'bottom center' }}
              >
                {guest.name}
                {guest.diet ? <span className="ml-1.5 text-[#E2C792]">· {guest.diet}</span> : null}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default memo(TableNode);
