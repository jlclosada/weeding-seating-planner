import { useMemo, useState } from 'react';
import { FileUp, Palette, Search, Trash2, UserPlus } from 'lucide-react';
import { Avatar } from './ui';
import { normalize, plural } from '../lib/text';
import { RSVP } from '../state/model';

const SORTS = {
  name: (a, b) => normalize(a.name).localeCompare(normalize(b.name), 'es'),
  table: (tableIndex) => (a, b) => (tableIndex.get(a.tableId) ?? 1e9) - (tableIndex.get(b.tableId) ?? 1e9) || (a.seat ?? 0) - (b.seat ?? 0),
};

export default function GuestsView({ doc, dispatch, onEdit, onAdd, onImport, onGroups, onDelete, onSeatAt }) {
  const [query, setQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('name');

  const groupColor = useMemo(() => new Map(doc.groups.map((g) => [g.id, g.color])), [doc.groups]);
  const groupName = useMemo(() => new Map(doc.groups.map((g) => [g.id, g.name])), [doc.groups]);
  const tableName = useMemo(() => new Map(doc.tables.map((t) => [t.id, t.name])), [doc.tables]);
  const free = useMemo(() => {
    const m = new Map(doc.tables.map((t) => [t.id, t.capacity]));
    for (const g of doc.guests) if (g.tableId != null) m.set(g.tableId, m.get(g.tableId) - 1);
    return m;
  }, [doc.tables, doc.guests]);

  const rows = useMemo(() => {
    const q = normalize(query);
    const tableIndex = new Map(doc.tables.map((t, i) => [t.id, i]));
    return doc.guests
      .filter((g) => (!q || normalize(g.name).includes(q) || normalize(g.diet).includes(q)) && (!groupFilter || (g.groupId ?? '') === groupFilter) && (status === 'all' || (status === 'seated' ? g.tableId != null : status === 'unseated' ? g.tableId == null && g.rsvp !== 'no' : g.rsvp === status)))
      .sort(sort === 'name' ? SORTS.name : SORTS.table(tableIndex));
  }, [doc.guests, doc.tables, query, groupFilter, status, sort]);

  const diets = doc.guests.filter((g) => g.diet).length;

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl min-h-0 flex-col px-4 pb-4 pt-5 sm:px-8 lg:pb-8 lg:pt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label">Lista de invitados</div>
          <h1 className="mt-2 font-serif text-[38px] font-medium leading-none">{plural(doc.guests.length, 'invitado', 'invitados')}</h1>
          <p className="mt-2 text-[13px] text-ink-3">
            {doc.guests.filter((g) => g.rsvp === 'yes').length} confirmados · {doc.guests.filter((g) => g.rsvp === 'pending').length} sin confirmar · {doc.guests.filter((g) => g.rsvp === 'no').length} no asisten · {doc.guests.filter((g) => g.tableId != null).length} sentados
            {diets ? ` · ${plural(diets, 'menú especial', 'menús especiales')}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={onGroups}>
            <Palette size={15} /> Grupos
          </button>
          <button className="btn" onClick={onImport}>
            <FileUp size={15} /> Importar
          </button>
          <button className="btn btn-primary" onClick={onAdd}>
            <UserPlus size={15} /> Añadir
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 md:flex md:flex-wrap md:items-center">
        <div className="relative col-span-3 min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input className="input pl-9" placeholder="Buscar por nombre o menú…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar" />
        </div>
        <select className="input px-2 text-[13px] md:w-auto md:px-3 md:text-[14px]" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} aria-label="Filtrar por grupo">
          <option value="">Grupo: todos</option>
          {doc.groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select className="input px-2 text-[13px] md:w-auto md:px-3 md:text-[14px]" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por estado">
          <option value="all">Estado: todos</option>
          <option value="unseated">Sin mesa</option>
          <option value="yes">Confirmados</option>
          <option value="pending">Sin confirmar</option>
          <option value="no">No asisten</option>
          <option value="seated">Sentados</option>
        </select>
        <select className="input px-2 text-[13px] md:w-auto md:px-3 md:text-[14px]" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar">
          <option value="name">A–Z</option>
          <option value="table">Por mesa</option>
        </select>
      </div>

      <div className="scroll-thin mt-4 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-line bg-card">
        <div className="sticky top-0 z-[1] hidden grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.05fr)_minmax(0,1.35fr)_minmax(0,1.1fr)_40px] gap-3 border-b border-line bg-card px-4 py-3 md:grid">
          {['Nombre', 'Grupo', 'Asistencia', 'Mesa', 'Menú', ''].map((h) => (
            <span key={h} className="label">
              {h}
            </span>
          ))}
        </div>
        {rows.map((g) => (
          <div key={g.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-paper-2 px-4 py-2.5 last:border-0 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.05fr)_minmax(0,1.35fr)_minmax(0,1.1fr)_40px]">
            <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => onEdit(g)}>
              <Avatar name={g.name} color={groupColor.get(g.groupId)} size={30} />
              <span className="min-w-0">
                <span className="block truncate text-[14px] hover:underline">{g.name}</span>
                <span className="block truncate text-[11.5px] text-ink-3 md:hidden">
                  {groupName.get(g.groupId) ?? 'Sin grupo'} · {g.tableId != null ? `${tableName.get(g.tableId)}, asiento ${g.seat + 1}` : 'Sin mesa'}
                  {g.diet ? ` · ${g.diet}` : ''}
                  {g.rsvp !== 'pending' ? ` · ${RSVP[g.rsvp]}` : ''}
                </span>
                {g.note && <span className="hidden truncate text-[11.5px] text-ink-3 md:block">{g.note}</span>}
              </span>
            </button>
            <button className="icon-btn h-8 w-8 border-transparent text-ink-3 hover:text-danger md:order-last" onClick={() => onDelete(g)} aria-label={`Eliminar a ${g.name}`}>
              <Trash2 size={14} />
            </button>
            <select
              className="input col-span-2 hidden h-9 text-[13px] md:col-span-1 md:block"
              value={g.groupId ?? ''}
              onChange={(e) => dispatch({ type: 'guest/update', id: g.id, patch: { groupId: e.target.value || null }, label: 'Cambiar grupo' })}
              aria-label={`Grupo de ${g.name}`}
            >
              <option value="">Sin grupo</option>
              {doc.groups.map((gr) => (
                <option key={gr.id} value={gr.id}>
                  {gr.name}
                </option>
              ))}
            </select>
            <select
              className={`input col-span-2 hidden h-9 text-[13px] md:col-span-1 md:block ${g.rsvp === 'yes' ? 'text-ok' : g.rsvp === 'no' ? 'text-danger' : 'text-ink-3'}`}
              value={g.rsvp}
              onChange={(e) => dispatch({ type: 'guest/update', id: g.id, patch: { rsvp: e.target.value }, label: 'Cambiar asistencia' })}
              aria-label={`Asistencia de ${g.name}`}
            >
              {Object.entries(RSVP).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select
              disabled={g.rsvp === 'no'}
              className={`input col-span-2 hidden h-9 text-[13px] md:col-span-1 md:block ${g.tableId == null ? 'text-ink-3' : ''}`}
              value={g.tableId == null ? '' : String(g.tableId)}
              onChange={(e) => onSeatAt(g, e.target.value)}
              aria-label={`Mesa de ${g.name}`}
            >
              <option value="">Sin mesa</option>
              {doc.tables.map((t) => (
                <option key={t.id} value={String(t.id)} disabled={t.id !== g.tableId && free.get(t.id) <= 0}>
                  {t.name}
                  {t.id === g.tableId ? ` · asiento ${g.seat + 1}` : free.get(t.id) <= 0 ? ' · completa' : ` · ${free.get(t.id)} libres`}
                </option>
              ))}
            </select>
            <input
              key={`${g.id}-${g.diet}`}
              className="input col-span-2 hidden h-9 text-[13px] md:col-span-1 md:block"
              defaultValue={g.diet}
              placeholder="—"
              list="diet-options-list"
              onBlur={(e) => e.target.value.trim() !== g.diet && dispatch({ type: 'guest/update', id: g.id, patch: { diet: e.target.value.trim() }, label: 'Cambiar menú' })}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              aria-label={`Menú de ${g.name}`}
            />
          </div>
        ))}
        <datalist id="diet-options-list">
          {['Vegetariano', 'Vegano', 'Sin gluten', 'Sin lactosa', 'Menú infantil'].map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
        {!rows.length && (
          <div className="px-6 py-16 text-center">
            <p className="font-serif text-[24px] italic text-ink-2">{doc.guests.length ? 'Nadie coincide con los filtros' : 'Tu lista está vacía'}</p>
            {!doc.guests.length && (
              <button className="btn btn-primary mt-4" onClick={onAdd}>
                <UserPlus size={15} /> Añadir invitados
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
