import { memo, useMemo, useState } from 'react';
import { FileUp, Pencil, Plus, Search, UserPlus, X } from 'lucide-react';
import { Avatar } from './ui';
import { useGuestFilter } from '../hooks/useGuestFilter';

export const GuestRow = memo(function GuestRow({ guest, color, tableName, picked, onPointerDown, onTouchStart, onClick, onEdit, compact }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={picked}
      onPointerDown={onPointerDown ? (e) => onPointerDown(e, guest.id) : undefined}
      onTouchStart={onTouchStart ? (e) => onTouchStart(e, guest.id) : undefined}
      onContextMenu={onTouchStart ? (e) => e.preventDefault() : undefined}
      onClick={() => onClick(guest)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick(guest))}
      className={`no-callout group flex cursor-pointer select-none items-center gap-2.5 rounded-[10px] px-2.5 ${compact ? 'py-1.5' : 'py-[7px]'} text-[13.5px] transition-colors ${
        picked ? 'bg-gold-soft ring-1 ring-gold' : 'hover:bg-paper'
      } ${tableName ? 'text-ink-2' : 'text-ink'}`}
    >
      <Avatar name={guest.name} color={color} size={28} className={tableName ? 'opacity-60' : ''} />
      <span className="min-w-0 flex-1 truncate">{guest.name}</span>
      {guest.diet && !tableName && <span className="max-w-[90px] truncate rounded-full border border-line px-2 py-[1px] text-[10.5px] text-ink-3">{guest.diet}</span>}
      {tableName && <span className="max-w-[96px] truncate font-serif text-[14px] italic text-ink-3">{tableName}</span>}
      {onEdit && (
        <button
          className="hidden h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-card hover:text-ink group-hover:flex"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(guest);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`Editar ${guest.name}`}
        >
          <Pencil size={13} />
        </button>
      )}
    </div>
  );
});

export default function GuestPanel({ doc, pickedGuestId, onPick, onEdit, onGuestPointerDown, onGuestTouchStart, onAdd, onImport, onGroups, query, setQuery }) {
  const [groupFilter, setGroupFilter] = useState(null);
  const [scope, setScope] = useState('unseated');
  const groupColor = useMemo(() => new Map(doc.groups.map((g) => [g.id, g.color])), [doc.groups]);
  const { sections, count, tableName } = useGuestFilter(doc, { query, groupFilter, scope });

  const total = doc.guests.filter((g) => g.rsvp !== 'no').length;
  const seated = doc.guests.filter((g) => g.tableId != null).length;
  const capacity = doc.tables.reduce((s, t) => s + t.capacity, 0);
  const pct = total ? Math.round((seated / total) * 100) : 0;
  const counts = useMemo(() => {
    const m = new Map();
    for (const g of doc.guests) if (g.tableId == null && g.rsvp !== 'no') m.set(g.groupId ?? '__none__', (m.get(g.groupId ?? '__none__') ?? 0) + 1);
    return m;
  }, [doc.guests]);

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-line bg-card" data-dropzone="list">
      <div className="border-b border-line px-5 pb-4 pt-5">
        <div className="label">Invitados sentados</div>
        <div className="mt-2 flex items-baseline gap-2 font-serif">
          <span className="text-[40px] font-medium leading-none">{seated}</span>
          <span className="text-[20px] text-ink-3">/ {total}</span>
        </div>
        <div className="mb-2 mt-3 h-1 overflow-hidden rounded-full bg-paper-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso">
          <div className="h-full rounded-full bg-gradient-to-r from-gold to-[#c8a56c] transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-[12px] text-ink-3">
          <span>{total - seated} sin mesa</span>
          <span>
            {doc.tables.length} mesas · {Math.max(0, capacity - seated)} libres
          </span>
        </div>
      </div>

      <div className="px-4 pb-2.5 pt-3.5">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input className="input h-9 bg-paper pl-9 pr-8 text-[13px]" placeholder="Buscar invitado…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar invitado" />
          {query && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-3 hover:text-ink" onClick={() => setQuery('')} aria-label="Limpiar búsqueda">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-line px-4 pb-3">
        <button className={`chip ${groupFilter === null ? 'chip-on' : ''}`} onClick={() => setGroupFilter(null)}>
          Todos
        </button>
        {doc.groups.map((g) => (
          <button key={g.id} className={`chip ${groupFilter === g.id ? 'chip-on' : ''}`} onClick={() => setGroupFilter(groupFilter === g.id ? null : g.id)}>
            <span className="h-[7px] w-[7px] rounded-full" style={{ background: g.color }} />
            {g.name}
            {counts.get(g.id) ? <span className="opacity-60">{counts.get(g.id)}</span> : null}
          </button>
        ))}
        <button className="chip border-dashed border-gold text-gold hover:bg-gold-soft" onClick={onGroups}>
          <Plus size={12} />
          Grupo
        </button>
      </div>

      <div className="flex items-center justify-between px-5 pb-1 pt-3">
        <div className="flex rounded-full border border-line bg-paper p-[2px] text-[11.5px]">
          {[
            ['unseated', 'Sin mesa'],
            ['all', 'Todos'],
          ].map(([v, l]) => (
            <button key={v} className={`rounded-full px-2.5 py-1 transition-colors ${scope === v ? 'bg-card text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'text-ink-3'}`} onClick={() => setScope(v)}>
              {l}
            </button>
          ))}
        </div>
        <span className="text-[11.5px] text-ink-3">{count}</span>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {sections.map(({ group, guests }) => (
          <section key={group.id}>
            <div className="sticky top-0 z-[1] flex items-center justify-between bg-card px-2.5 pb-1.5 pt-3">
              <span className="label flex items-center gap-2">
                <span className="h-[7px] w-[7px] rounded-full" style={{ background: group.color ?? 'var(--line-2)' }} />
                {group.name}
              </span>
              <span className="label">{guests.length}</span>
            </div>
            {guests.map((g) => (
              <GuestRow
                key={g.id}
                guest={g}
                color={groupColor.get(g.groupId)}
                tableName={g.tableId != null ? tableName.get(g.tableId) : null}
                picked={pickedGuestId === g.id}
                onPointerDown={onGuestPointerDown}
                onTouchStart={onGuestTouchStart}
                onClick={onPick}
                onEdit={onEdit}
              />
            ))}
          </section>
        ))}
        {!sections.length && (
          <div className="px-6 py-12 text-center">
            {total === 0 ? (
              <>
                <p className="font-serif text-[22px] italic text-ink-2">Aún no hay invitados</p>
                <p className="mt-2 text-[13px] text-ink-3">Pega tu lista o importa un Excel para empezar.</p>
              </>
            ) : query ? (
              <p className="text-[13px] text-ink-3">Nadie coincide con «{query}».</p>
            ) : (
              <>
                <p className="font-serif text-[22px] italic text-ink-2">¡Todos sentados!</p>
                <p className="mt-2 text-[13px] text-ink-3">Cada invitado tiene su sitio.</p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t border-line p-3">
        <button className="btn flex-1 border-dashed" onClick={onAdd}>
          <UserPlus size={15} /> Añadir invitados
        </button>
        <button className="icon-btn" onClick={onImport} aria-label="Importar desde Excel o CSV" title="Importar Excel / CSV">
          <FileUp size={15} />
        </button>
      </div>
    </aside>
  );
}
