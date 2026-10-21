import { useMemo } from 'react';
import { AlertTriangle, ArrowRight, CheckSquare, Clock, FileSpreadsheet, FileText, Users, Utensils, Wallet, Wand2 } from 'lucide-react';
import { analyze } from '../lib/autoAssign';
import { plural } from '../lib/text';

function Kpi({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-5 py-4">
      <div className="label">{label}</div>
      <div className="mt-2 font-serif text-[38px] font-medium leading-none">{value}</div>
      {sub && <div className="mt-1.5 text-[12.5px] text-ink-3">{sub}</div>}
    </div>
  );
}

function Bar({ value, max, color = 'var(--gold)' }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2">
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function SummaryView({ doc, onOpenPlanning, onOpenTable, onAutoSeat, onExportPDF, onExportExcel, onEditGuest }) {
  const { conflicts, scattered, empty, byTable } = useMemo(() => analyze(doc), [doc]);
  const seated = doc.guests.filter((g) => g.tableId != null).length;
  const attending = doc.guests.filter((g) => g.rsvp !== 'no').length;
  const confirmed = doc.guests.filter((g) => g.rsvp === 'yes').length;
  const declined = doc.guests.length - attending;
  const budgetTotal = doc.budget.reduce((s, b) => s + b.unit * (b.mode === 'guest' ? attending : b.mode === 'table' ? doc.tables.length : b.qty), 0);
  const tasksDone = doc.tasks.filter((t) => t.done).length;
  const nextTask = doc.tasks.filter((t) => !t.done).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'))[0];
  const moments = [...doc.timeline].sort((a, b) => a.time.localeCompare(b.time));
  const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const capacity = doc.tables.reduce((s, t) => s + t.capacity, 0);
  const unseated = attending - seated;
  const pct = attending ? Math.round((seated / attending) * 100) : 0;

  const diets = useMemo(() => {
    const m = new Map();
    for (const g of doc.guests) if (g.diet) m.set(g.diet, [...(m.get(g.diet) ?? []), g]);
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [doc.guests]);
  const tableName = new Map(doc.tables.map((t) => [t.id, t.name]));

  const notices = [
    ...conflicts.map((c) => ({ key: `c-${c.a.id}-${c.b.id}`, tone: 'danger', text: `${c.a.name} y ${c.b.name} comparten ${c.table.name}`, action: () => onOpenTable(c.tableId), cta: 'Ver mesa' })),
    ...(unseated && capacity >= attending ? [{ key: 'u', tone: 'info', text: `${plural(unseated, 'invitado sigue', 'invitados siguen')} sin mesa`, action: onAutoSeat, cta: 'Sentar automáticamente' }] : []),
    ...(capacity < attending ? [{ key: 'cap', tone: 'danger', text: `Faltan ${attending - capacity} asientos para todos los invitados`, action: onAutoSeat, cta: 'Crear mesas y sentar' }] : []),
    ...scattered.map((s) => ({ key: `s-${s.group.id}`, tone: 'info', text: `«${s.group.name}» está repartido en ${s.tables} mesas` })),
    ...(empty.length ? [{ key: 'e', tone: 'info', text: `${plural(empty.length, 'mesa vacía', 'mesas vacías')}: ${empty.map((t) => t.name).join(', ')}` }] : []),
  ];

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-8 lg:pb-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="label">Resumen</div>
            <h1 className="mt-2 font-serif text-[38px] font-medium leading-none">Cómo va el plano</h1>
          </div>
          <div className="flex gap-2">
            <button className="btn" onClick={onExportExcel}>
              <FileSpreadsheet size={15} /> Excel
            </button>
            <button className="btn btn-primary" onClick={onExportPDF}>
              <FileText size={15} /> PDF para imprimir
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Asisten" value={attending} sub={`${confirmed} confirmados${declined ? ` · ${declined} no vienen` : ''}`} />
          <Kpi label="Sentados" value={`${pct}%`} sub={`${seated} de ${attending}`} />
          <Kpi label="Mesas" value={doc.tables.length} sub={`${capacity} asientos`} />
          <Kpi label="Libres" value={Math.max(0, capacity - seated)} sub={capacity < attending ? 'Faltan asientos' : 'Asientos sin ocupar'} />
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {[
            { id: 'budget', icon: Wallet, label: 'Presupuesto', value: eur.format(budgetTotal), sub: doc.budgetCap ? (budgetTotal > doc.budgetCap ? `${eur.format(budgetTotal - doc.budgetCap)} por encima del máximo` : `${eur.format(doc.budgetCap - budgetTotal)} de margen`) : `${doc.budget.length} partidas` },
            { id: 'tasks', icon: CheckSquare, label: 'Tareas', value: `${tasksDone} / ${doc.tasks.length}`, sub: nextTask ? `Siguiente: ${nextTask.title}` : 'Todo hecho' },
            { id: 'timeline', icon: Clock, label: 'Cronograma', value: moments.length ? `${moments[0].time}` : '—', sub: moments.length ? `${moments.length} momentos · empieza con «${moments[0].title}»` : 'Añade los momentos del día' },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <button key={c.id} onClick={() => onOpenPlanning(c.id)} className="group flex items-center gap-4 rounded-2xl border border-line bg-card px-5 py-4 text-left transition-colors hover:border-gold">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold">
                  <Icon size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="label">{c.label}</span>
                  <span className="mt-1 block font-serif text-[24px] leading-none">{c.value}</span>
                  <span className="mt-1 block truncate text-[12px] text-ink-3">{c.sub}</span>
                </span>
                <ArrowRight size={15} className="text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-gold" />
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <section className="rounded-2xl border border-line bg-card p-5">
            <h2 className="flex items-center gap-2 font-serif text-[24px]">
              <Users size={17} className="text-gold" /> Mesas
            </h2>
            <div className="mt-4 flex flex-col">
              {doc.tables.map((t) => {
                const n = byTable.get(t.id).length;
                return (
                  <button key={t.id} className="group flex items-center gap-4 border-b border-paper-2 py-2.5 text-left last:border-0" onClick={() => onOpenTable(t.id)}>
                    <span className="w-36 truncate font-serif text-[18px] italic group-hover:text-gold">{t.name}</span>
                    <Bar value={n} max={t.capacity} color={n === t.capacity ? 'var(--ok)' : 'var(--gold)'} />
                    <span className="w-14 text-right text-[12.5px] tabular-nums text-ink-3">
                      {n} / {t.capacity}
                    </span>
                  </button>
                );
              })}
              {!doc.tables.length && <p className="py-6 text-[13px] text-ink-3">Todavía no hay mesas en el plano.</p>}
            </div>
          </section>

          <div className="flex flex-col gap-4">
            <section className="rounded-2xl border border-line bg-card p-5">
              <h2 className="flex items-center gap-2 font-serif text-[24px]">
                <AlertTriangle size={16} className="text-gold" /> Avisos
              </h2>
              <div className="mt-3 flex flex-col gap-2">
                {notices.map((n) => (
                  <div key={n.key} className={`flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-[13px] ${n.tone === 'danger' ? 'bg-[#fbf0e6] text-[#8a4b23]' : 'bg-paper text-ink-2'}`}>
                    <span className="flex-1">{n.text}</span>
                    {n.action && (
                      <button className="flex shrink-0 items-center gap-1 font-medium text-ink hover:text-gold" onClick={n.action}>
                        {n.cta === 'Sentar automáticamente' && <Wand2 size={13} />}
                        {n.cta} <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                ))}
                {!notices.length && <p className="text-[13px] text-ink-3">Todo en orden. ✨</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-card p-5">
              <h2 className="font-serif text-[24px]">Grupos</h2>
              <div className="mt-3 flex flex-col gap-2.5">
                {doc.groups.map((gr) => {
                  const all = doc.guests.filter((g) => g.groupId === gr.id);
                  const s = all.filter((g) => g.tableId != null).length;
                  return (
                    <div key={gr.id} className="flex items-center gap-3 text-[13px]">
                      <span className="h-2 w-2 rounded-full" style={{ background: gr.color }} />
                      <span className="w-28 truncate">{gr.name}</span>
                      <Bar value={s} max={all.length} color={gr.color} />
                      <span className="w-12 text-right tabular-nums text-ink-3">
                        {s}/{all.length}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-card p-5">
              <h2 className="flex items-center gap-2 font-serif text-[24px]">
                <Utensils size={16} className="text-gold" /> Menús especiales
              </h2>
              <div className="mt-3 flex flex-col gap-3">
                {diets.map(([diet, list]) => (
                  <div key={diet}>
                    <div className="text-[13px] font-medium">
                      {diet} <span className="text-ink-3">· {list.length}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-ink-2">
                      {list.map((g) => (
                        <button key={g.id} className="hover:text-ink hover:underline" onClick={() => onEditGuest(g)}>
                          {g.name}
                          <span className="font-serif italic text-ink-3"> · {g.tableId != null ? tableName.get(g.tableId) : 'sin mesa'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {!diets.length && <p className="text-[13px] text-ink-3">Añade el menú desde la ficha de cada invitado; aquí verás el recuento para el catering.</p>}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
