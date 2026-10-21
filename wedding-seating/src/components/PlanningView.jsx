import { useEffect, useMemo, useState } from 'react';
import { Check, CheckSquare, Clock, Download, History, Plus, RotateCcw, Trash2, Wallet } from 'lucide-react';
import { makeBudgetItem, makeMoment, makeTask } from '../state/model';
import { useVersions } from '../lib/versions';
import { plural } from '../lib/text';

const SECTIONS = [
  { id: 'budget', label: 'Presupuesto', icon: Wallet },
  { id: 'tasks', label: 'Tareas', icon: CheckSquare },
  { id: 'timeline', label: 'Cronograma', icon: Clock },
  { id: 'versions', label: 'Versiones', icon: History },
];

const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const MODES = { guest: 'por invitado', table: 'por mesa', fixed: 'importe fijo' };

/** Campo de texto que solo guarda al salir o pulsar Enter: un único paso de deshacer por edición. */
function InlineInput({ value, onCommit, type = 'text', className = '', ...rest }) {
  const [draft, setDraft] = useState(value ?? '');
  useEffect(() => setDraft(value ?? ''), [value]);
  const commit = () => {
    const next = type === 'number' ? (draft === '' ? 0 : Number(draft)) : draft;
    if (next !== value && !(type === 'number' && Number.isNaN(next))) onCommit(next);
    else setDraft(value ?? '');
  };
  return (
    <input
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className={`rounded-md bg-transparent px-1.5 py-1 outline-none transition-colors hover:bg-paper focus:bg-paper focus:ring-1 focus:ring-gold ${className}`}
      {...rest}
    />
  );
}

function SectionHeader({ kicker, title, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="label">{kicker}</div>
        <h2 className="mt-2 font-serif text-[32px] font-medium leading-none">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- Presupuesto
function Budget({ doc, dispatch }) {
  const guests = doc.guests.filter((g) => g.rsvp !== 'no').length;
  const tables = doc.tables.length;
  const qtyOf = (it) => (it.mode === 'guest' ? guests : it.mode === 'table' ? tables : it.qty);
  const rows = doc.budget.map((it) => ({ ...it, quantity: qtyOf(it), total: qtyOf(it) * it.unit }));
  const total = rows.reduce((s, r) => s + r.total, 0);
  const paid = rows.filter((r) => r.paid).reduce((s, r) => s + r.total, 0);
  const cap = doc.budgetCap;
  const over = cap != null && total > cap;
  const categories = [...new Set(rows.map((r) => r.category || 'Otros'))];
  const [draft, setDraft] = useState({ name: '', category: '', mode: 'fixed', unit: '' });

  const update = (id, patch) => dispatch({ type: 'list/update', key: 'budget', id, patch, label: 'Editar presupuesto' });
  const add = (e) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    dispatch({ type: 'list/add', key: 'budget', item: makeBudgetItem({ ...draft, name: draft.name.trim(), category: draft.category.trim() || 'Otros', unit: Number(draft.unit) || 0 }), label: 'Añadir partida' });
    setDraft({ name: '', category: draft.category, mode: 'fixed', unit: '' });
  };

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader kicker="Presupuesto" title={eur.format(total)}>
        <label className="flex items-center gap-2 text-[13px] text-ink-2">
          Presupuesto máximo
          <span className="relative">
            <InlineInput
              type="number"
              min="0"
              value={cap ?? ''}
              placeholder="Sin límite"
              onCommit={(v) => dispatch({ type: 'budget/cap', value: v > 0 ? v : null, label: 'Presupuesto máximo' })}
              className="w-32 border border-line bg-card pr-6 text-right"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-3">€</span>
          </span>
        </label>
      </SectionHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Pagado', eur.format(paid)],
          ['Pendiente de pago', eur.format(total - paid)],
          ['Por invitado', guests ? eur.format(total / guests) : '—'],
          [cap != null ? (over ? 'Por encima' : 'Margen') : 'Partidas', cap != null ? eur.format(Math.abs(cap - total)) : rows.length],
        ].map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-line bg-card px-5 py-4">
            <div className="label">{l}</div>
            <div className={`mt-2 font-serif text-[28px] leading-none ${l === 'Por encima' ? 'text-danger' : ''}`}>{v}</div>
          </div>
        ))}
      </div>
      {cap != null && cap > 0 && (
        <div className="h-1.5 overflow-hidden rounded-full bg-paper-2">
          <div className={`h-full rounded-full transition-[width] duration-500 ${over ? 'bg-danger' : 'bg-gold'}`} style={{ width: `${Math.min(100, (total / cap) * 100)}%` }} />
        </div>
      )}

      <div className="rounded-2xl border border-line bg-card">
        {categories.map((cat) => (
          <section key={cat} className="border-b border-line last:border-0">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <span className="label">{cat}</span>
              <span className="text-[12px] tabular-nums text-ink-3">{eur.format(rows.filter((r) => (r.category || 'Otros') === cat).reduce((s, r) => s + r.total, 0))}</span>
            </div>
            {rows
              .filter((r) => (r.category || 'Otros') === cat)
              .map((r) => {
                const calc = (
                  <span className="flex items-center gap-1 text-[12.5px] text-ink-3">
                    <InlineInput type="number" min="0" value={r.unit} onCommit={(unit) => update(r.id, { unit: Math.max(0, unit) })} className="w-20 text-right tabular-nums text-ink" aria-label="Precio unitario" />€
                    <select className="rounded-md bg-transparent px-1 py-1 text-[12.5px] hover:bg-paper" value={r.mode} onChange={(e) => update(r.id, { mode: e.target.value })} aria-label="Cómo se calcula">
                      {Object.entries(MODES).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                    {r.mode === 'fixed' ? (
                      <>
                        ×<InlineInput type="number" min="0" value={r.qty} onCommit={(qty) => update(r.id, { qty: Math.max(0, qty) })} className="w-12 text-right tabular-nums text-ink" aria-label="Cantidad" />
                      </>
                    ) : (
                      <span className="tabular-nums">× {r.quantity}</span>
                    )}
                  </span>
                );
                return (
                  <div key={r.id} className="group px-3 py-1.5 text-[13.5px]">
                    <div className="flex items-center gap-3">
                      <button
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${r.paid ? 'border-ok bg-ok text-white' : 'border-line-2 bg-card'}`}
                        onClick={() => update(r.id, { paid: !r.paid })}
                        aria-label={r.paid ? `Marcar ${r.name} como no pagado` : `Marcar ${r.name} como pagado`}
                        title={r.paid ? 'Pagado' : 'Marcar como pagado'}
                      >
                        {r.paid && <Check size={13} />}
                      </button>
                      <InlineInput value={r.name} onCommit={(name) => update(r.id, { name })} className={`min-w-0 flex-1 ${r.paid ? 'text-ink-3 line-through' : ''}`} aria-label="Concepto" />
                      <span className="hidden md:flex">{calc}</span>
                      <span className="w-24 text-right font-medium tabular-nums">{eur.format(r.total)}</span>
                      <button className="rounded-md p-1 text-ink-3 opacity-0 hover:text-danger focus:opacity-100 group-hover:opacity-100 max-md:opacity-100" onClick={() => dispatch({ type: 'list/remove', key: 'budget', id: r.id, label: 'Eliminar partida' })} aria-label={`Eliminar ${r.name}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="pl-7 md:hidden">{calc}</div>
                  </div>
                );
              })}
          </section>
        ))}
        <form onSubmit={add} className="flex flex-wrap items-center gap-2 border-t border-line bg-paper px-3 py-3">
          <input className="input h-9 min-w-[160px] flex-[2] text-[13px]" placeholder="Nueva partida, p. ej. Flores" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className="input h-9 min-w-[110px] flex-1 text-[13px]" placeholder="Categoría" list="budget-categories" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
          <datalist id="budget-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <input className="input h-9 w-24 text-right text-[13px]" type="number" min="0" placeholder="€" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} aria-label="Precio" />
          <select className="input h-9 w-auto text-[13px]" value={draft.mode} onChange={(e) => setDraft({ ...draft, mode: e.target.value })} aria-label="Cómo se calcula">
            {Object.entries(MODES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" disabled={!draft.name.trim()}>
            <Plus size={15} /> Añadir
          </button>
        </form>
      </div>
      <p className="text-[12.5px] text-ink-3">
        Las partidas «por invitado» usan los {plural(guests, 'invitado', 'invitados')} que asisten y las «por mesa», las {plural(tables, 'mesa', 'mesas')} del plano: se actualizan solas.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- Tareas
function Tasks({ doc, dispatch }) {
  const [filter, setFilter] = useState('pending');
  const [draft, setDraft] = useState({ title: '', category: '', due: '' });
  const today = new Date().toISOString().slice(0, 10);
  const done = doc.tasks.filter((t) => t.done).length;
  const categories = [...new Set(doc.tasks.map((t) => t.category).filter(Boolean))];
  const list = useMemo(
    () =>
      doc.tasks
        .filter((t) => (filter === 'all' ? true : filter === 'done' ? t.done : !t.done))
        .sort((a, b) => Number(a.done) - Number(b.done) || (a.due || '9999').localeCompare(b.due || '9999')),
    [doc.tasks, filter],
  );
  const update = (id, patch, label = 'Editar tarea') => dispatch({ type: 'list/update', key: 'tasks', id, patch, label });
  const add = (e) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    dispatch({ type: 'list/add', key: 'tasks', item: makeTask({ ...draft, title: draft.title.trim(), category: draft.category.trim() || 'General' }), label: 'Añadir tarea' });
    setDraft({ title: '', category: draft.category, due: '' });
  };

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader kicker="Tareas" title={`${done} de ${doc.tasks.length} hechas`}>
        <div className="flex rounded-full border border-line bg-card p-[3px] text-[12.5px]">
          {[
            ['pending', 'Pendientes'],
            ['done', 'Hechas'],
            ['all', 'Todas'],
          ].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} className={`rounded-full px-3 py-1.5 ${filter === v ? 'bg-ink text-paper' : 'text-ink-2'}`}>
              {l}
            </button>
          ))}
        </div>
      </SectionHeader>
      <div className="h-1.5 overflow-hidden rounded-full bg-paper-2">
        <div className="h-full rounded-full bg-ok transition-[width] duration-500" style={{ width: `${doc.tasks.length ? (done / doc.tasks.length) * 100 : 0}%` }} />
      </div>

      <div className="rounded-2xl border border-line bg-card">
        {list.map((t) => {
          const overdue = !t.done && t.due && t.due < today;
          return (
            <div key={t.id} className="group flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-paper-2 px-3 py-2 text-[14px] last:border-0 md:flex-nowrap">
              <button
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${t.done ? 'border-ok bg-ok text-white' : 'border-line-2 bg-card hover:border-ok'}`}
                onClick={() => update(t.id, { done: !t.done }, t.done ? 'Reabrir tarea' : 'Completar tarea')}
                aria-label={t.done ? `Reabrir «${t.title}»` : `Completar «${t.title}»`}
              >
                {t.done && <Check size={13} />}
              </button>
              <InlineInput value={t.title} onCommit={(title) => title.trim() && update(t.id, { title: title.trim() })} className={`min-w-0 flex-1 ${t.done ? 'text-ink-3 line-through' : ''}`} aria-label="Tarea" />
              <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-3">{t.category}</span>
              <input
                type="date"
                value={t.due}
                onChange={(e) => update(t.id, { due: e.target.value }, 'Cambiar fecha')}
                className={`rounded-md bg-transparent px-1.5 py-1 text-[12.5px] hover:bg-paper ${overdue ? 'font-medium text-danger' : t.due ? 'text-ink-2' : 'text-ink-3'}`}
                aria-label="Fecha límite"
              />
              <button className="rounded-md p-1 text-ink-3 opacity-0 hover:text-danger focus:opacity-100 group-hover:opacity-100 max-md:opacity-100" onClick={() => dispatch({ type: 'list/remove', key: 'tasks', id: t.id, label: 'Eliminar tarea' })} aria-label={`Eliminar «${t.title}»`}>
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
        {!list.length && <p className="px-4 py-10 text-center font-serif text-[20px] italic text-ink-3">{filter === 'pending' ? '¡Nada pendiente!' : 'Sin tareas aquí'}</p>}
        <form onSubmit={add} className="flex flex-wrap items-center gap-2 border-t border-line bg-paper px-3 py-3">
          <input className="input h-9 min-w-[180px] flex-[2] text-[13px]" placeholder="Nueva tarea, p. ej. Elegir las alianzas" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <input className="input h-9 min-w-[110px] flex-1 text-[13px]" placeholder="Categoría" list="task-categories" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
          <datalist id="task-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <input className="input h-9 w-auto text-[13px]" type="date" value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} aria-label="Fecha límite" />
          <button className="btn btn-primary" disabled={!draft.title.trim()}>
            <Plus size={15} /> Añadir
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Cronograma
const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const fromMin = (n) => `${String(Math.floor(n / 60) % 24).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

function Timeline({ doc, dispatch }) {
  const items = [...doc.timeline].sort((a, b) => toMin(a.time) - toMin(b.time));
  const [draft, setDraft] = useState({ time: '', title: '', duration: 30 });
  const last = items[items.length - 1];
  const update = (id, patch) => dispatch({ type: 'list/update', key: 'timeline', id, patch, label: 'Editar cronograma' });
  const add = (e) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    const time = draft.time || (last ? fromMin(toMin(last.time) + last.duration) : '18:00');
    dispatch({ type: 'list/add', key: 'timeline', item: makeMoment({ time, title: draft.title.trim(), duration: Number(draft.duration) || 0 }), label: 'Añadir momento' });
    setDraft({ time: '', title: '', duration: 30 });
  };

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader kicker="Cronograma del día" title={items.length ? `${items[0].time} – ${fromMin(toMin(last.time) + last.duration)}` : 'Sin momentos'} />
      <div className="rounded-2xl border border-line bg-card px-3 py-4 sm:px-5">
        <ol className="relative">
          {items.map((m, i) => (
            <li key={m.id} className="group flex gap-3 sm:gap-4">
              <input type="time" value={m.time} onChange={(e) => e.target.value && update(m.id, { time: e.target.value })} className="time-plain mt-0.5 h-8 w-[58px] shrink-0 rounded-md bg-transparent px-1 text-[14px] font-medium tabular-nums hover:bg-paper" aria-label="Hora" />
              <span className="relative flex w-3 shrink-0 justify-center" aria-hidden>
                <span className="relative z-[1] mt-3 h-3 w-3 rounded-full border-2 border-gold bg-card" />
                {i < items.length - 1 && <span className="absolute bottom-0 top-6 w-px bg-line" />}
              </span>
              <div className="min-w-0 flex-1 pb-4">
                <InlineInput value={m.title} onCommit={(title) => title.trim() && update(m.id, { title: title.trim() })} className="w-full font-serif text-[20px]" aria-label="Momento" />
                <div className="flex flex-wrap items-center gap-1 px-1.5 text-[12px] text-ink-3">
                  <InlineInput type="number" min="0" step="5" value={m.duration} onCommit={(duration) => update(m.id, { duration: Math.max(0, duration) })} className="w-14 text-right tabular-nums" aria-label="Duración en minutos" />
                  min · hasta las {fromMin(toMin(m.time) + m.duration)}
                  {i < items.length - 1 && toMin(m.time) + m.duration > toMin(items[i + 1].time) && <span className="ml-1 text-danger">· se solapa con «{items[i + 1].title}»</span>}
                </div>
                <InlineInput value={m.note} placeholder="Añadir nota…" onCommit={(note) => update(m.id, { note })} className="w-full text-[12.5px] text-ink-2" aria-label="Nota" />
              </div>
              <button className="h-fit rounded-md p-1 text-ink-3 opacity-0 hover:text-danger focus:opacity-100 group-hover:opacity-100 max-md:opacity-100" onClick={() => dispatch({ type: 'list/remove', key: 'timeline', id: m.id, label: 'Eliminar momento' })} aria-label={`Eliminar ${m.title}`}>
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ol>
        <form onSubmit={add} className="mt-1 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <input className="input h-9 w-auto text-[13px]" type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} aria-label="Hora" title="Vacío: a continuación del último momento" />
          <input className="input h-9 min-w-[180px] flex-1 text-[13px]" placeholder="Nuevo momento, p. ej. Corte de la tarta" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <input className="input h-9 w-20 text-right text-[13px]" type="number" min="0" step="5" value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: e.target.value })} aria-label="Duración en minutos" />
          <span className="text-[12px] text-ink-3">min</span>
          <button className="btn btn-primary" disabled={!draft.title.trim()}>
            <Plus size={15} /> Añadir
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Versiones
function Versions({ doc, onRestore, toast }) {
  const { versions, save, remove } = useVersions();
  const [name, setName] = useState('');
  const create = (e) => {
    e.preventDefault();
    const label = name.trim() || `Versión del ${new Date().toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
    if (save(label, doc)) toast.show(`«${label}» guardada`);
    else toast.show('No hay espacio para más versiones en este navegador', { tone: 'error' });
    setName('');
  };
  const download = (v) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ app: 'wedding-seating-planner', ...v.doc }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${v.name.replace(/[^\p{L}\p{N}]+/gu, '-')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader kicker="Versiones" title="Guarda y vuelve atrás" />
      <form onSubmit={create} className="flex flex-wrap gap-2">
        <input className="input min-w-[220px] flex-1" placeholder="Nombre, p. ej. «Antes de mover a los primos»" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary h-10">
          <History size={15} /> Guardar versión actual
        </button>
      </form>
      <div className="rounded-2xl border border-line bg-card">
        {versions.map((v) => {
          const seated = v.doc.guests?.filter((g) => g.tableId != null).length ?? 0;
          return (
            <div key={v.id} className="flex flex-wrap items-center gap-3 border-b border-paper-2 px-4 py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="truncate font-serif text-[19px]">{v.name}</div>
                <div className="text-[12px] text-ink-3">
                  {new Date(v.date).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })} · {plural(v.doc.tables?.length ?? 0, 'mesa', 'mesas')} · {seated}/{v.doc.guests?.length ?? 0} sentados
                </div>
              </div>
              <button className="btn" onClick={() => onRestore(v)}>
                <RotateCcw size={14} /> Restaurar
              </button>
              <button className="icon-btn" onClick={() => download(v)} aria-label={`Descargar ${v.name}`} title="Descargar como copia .json">
                <Download size={15} />
              </button>
              <button className="icon-btn hover:text-danger" onClick={() => remove(v.id)} aria-label={`Eliminar ${v.name}`}>
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
        {!versions.length && <p className="px-6 py-10 text-center text-[13px] text-ink-3">Aún no has guardado ninguna versión. Guarda una antes de grandes cambios para poder volver a ella cuando quieras.</p>}
      </div>
      <p className="text-[12.5px] text-ink-3">Las versiones se guardan en este navegador (hasta 30). Para pasarlas a otro dispositivo, descárgalas y usa «Restaurar copia de seguridad».</p>
    </div>
  );
}

export default function PlanningView({ doc, dispatch, onRestoreVersion, toast, section, setSection }) {
  const active = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0];
  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-4 pb-12 pt-5 sm:px-8 lg:pt-6">
        <nav className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Secciones de organización">
          {SECTIONS.map(({ id, label, icon }) => {
            const Icon = icon;
            return (
              <button key={id} onClick={() => setSection(id)} aria-current={active.id === id ? 'page' : undefined} className={`chip h-9 shrink-0 px-3.5 text-[13px] ${active.id === id ? 'chip-on' : ''}`}>
                <Icon size={14} /> {label}
              </button>
            );
          })}
        </nav>
        {active.id === 'budget' && <Budget doc={doc} dispatch={dispatch} />}
        {active.id === 'tasks' && <Tasks doc={doc} dispatch={dispatch} />}
        {active.id === 'timeline' && <Timeline doc={doc} dispatch={dispatch} />}
        {active.id === 'versions' && <Versions doc={doc} onRestore={onRestoreVersion} toast={toast} />}
      </div>
    </div>
  );
}
