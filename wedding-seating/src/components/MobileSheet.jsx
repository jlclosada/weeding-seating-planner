import { useMemo, useState } from 'react';
import { ChevronUp, Palette, Search, UserPlus, Wand2 } from 'lucide-react';
import { Avatar } from './ui';
import { GuestRow } from './GuestPanel';
import { useGuestFilter } from '../hooks/useGuestFilter';

/** Hoja inferior del plano en móvil: invitados sin mesa (o la mesa seleccionada). */
function Sheet({ doc, onGuestTouchStart, pickedGuestId, onPick, onEdit, onAdd, onGroups, onAutoSeat, query, setQuery, children }) {
  const [expanded, setExpanded] = useState(false);
  const groupColor = useMemo(() => new Map(doc.groups.map((g) => [g.id, g.color])), [doc.groups]);
  const { sections, tableName } = useGuestFilter(doc, { query, groupFilter: null, scope: 'unseated' });
  const unseated = doc.guests.filter((g) => g.tableId == null && g.rsvp !== 'no');

  if (children) {
    return (
      <div className="slide-up absolute inset-x-0 bottom-0 z-30 flex max-h-[52%] flex-col rounded-t-3xl border-t border-line bg-card shadow-lift" onPointerDown={(e) => e.stopPropagation()}>
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-2" />
        {children}
      </div>
    );
  }

  const pick = (g) => {
    onPick(g);
    setExpanded(false);
  };

  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-3xl border-t border-line bg-card shadow-lift transition-[height] duration-300 ${expanded ? 'h-[66%]' : 'h-[148px]'}`}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button className="flex shrink-0 flex-col items-center pt-2" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-label={expanded ? 'Contraer lista' : 'Ver lista completa'}>
        <span className="h-1 w-10 rounded-full bg-line-2" />
        <span className="mt-2 flex w-full items-center justify-between px-5">
          <span className="text-left">
            <span className="block font-serif text-[22px] font-medium leading-tight">Sin mesa · {unseated.length}</span>
            {unseated.length > 0 && doc.tables.length > 0 && <span className="block text-[11.5px] text-ink-3">Mantén pulsado y arrastra a una silla</span>}
          </span>
          <span className="label flex shrink-0 items-center gap-1 whitespace-nowrap">
            {expanded ? 'Cerrar' : 'Ver todos'}
            <ChevronUp size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </span>
        </span>
      </button>

      {!expanded ? (
        <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto px-4 pb-4 pt-2.5">
          {unseated.length > 0 && doc.tables.length > 0 && (
            <button className="flex shrink-0 items-center gap-1.5 rounded-full border border-gold bg-gold-soft px-3 text-[12.5px] font-medium" onClick={onAutoSeat}>
              <Wand2 size={13} /> Auto
            </button>
          )}
          {unseated.slice(0, 80).map((g) => (
            <button
              key={g.id}
              onClick={() => onPick(g)}
              onTouchStart={(e) => onGuestTouchStart(e, g.id)}
              onContextMenu={(e) => e.preventDefault()}
              className={`no-callout flex h-10 shrink-0 select-none items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[13px] transition-transform active:scale-95 ${pickedGuestId === g.id ? 'border-gold bg-gold-soft' : 'border-line bg-card'}`}
            >
              <Avatar name={g.name} color={groupColor.get(g.groupId)} size={30} />
              {g.name.split(' ')[0]}
            </button>
          ))}
          {!unseated.length && (
            <button className="btn h-10 shrink-0" onClick={onAdd}>
              <UserPlus size={15} /> {doc.guests.length ? '¡Todos sentados! Añadir más' : 'Añadir invitados'}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex shrink-0 gap-2 px-4 pb-2 pt-3">
            <div className="relative flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
              <input className="input h-10 bg-paper pl-9" placeholder="Buscar invitado…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar invitado" />
            </div>
            <button className="icon-btn h-10 w-10" onClick={onGroups} aria-label="Grupos de invitados">
              <Palette size={16} />
            </button>
            <button className="icon-btn h-10 w-10" onClick={onAdd} aria-label="Añadir invitados">
              <UserPlus size={16} />
            </button>
          </div>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-2 pb-6">
            {sections.map(({ group, guests }) => (
              <section key={group.id}>
                <div className="label flex items-center gap-2 px-3 pb-1 pt-3">
                  <span className="h-[7px] w-[7px] rounded-full" style={{ background: group.color ?? 'var(--line-2)' }} />
                  {group.name} · {guests.length}
                </div>
                {guests.map((g) => (
                  <GuestRow key={g.id} guest={g} color={groupColor.get(g.groupId)} tableName={g.tableId != null ? tableName.get(g.tableId) : null} picked={pickedGuestId === g.id} onClick={pick} onEdit={onEdit} onTouchStart={onGuestTouchStart} />
                ))}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Durante un arrastre la hoja se oculta (sin desmontarse: el dedo sigue "agarrado" a
 * su elemento) y en su lugar aparece una zona para devolver al invitado a la lista.
 */
export default function MobileSheet({ dragging, draggingSeated, ...props }) {
  return (
    <>
      <div className={dragging ? 'invisible' : undefined} style={{ display: 'contents' }}>
        <Sheet {...props} />
      </div>
      {dragging && (
        <div
          data-dropzone={draggingSeated ? 'list' : undefined}
          className={`fade-in absolute inset-x-0 bottom-0 z-30 flex h-[88px] items-center justify-center rounded-t-3xl border-t-2 border-dashed px-6 text-center text-[14px] shadow-lift ${
            draggingSeated ? 'border-gold bg-gold-soft text-ink' : 'border-line bg-card text-ink-3'
          }`}
        >
          {draggingSeated ? 'Suelta aquí para quitarle de la mesa' : 'Suéltale sobre una silla libre'}
        </div>
      )}
    </>
  );
}
