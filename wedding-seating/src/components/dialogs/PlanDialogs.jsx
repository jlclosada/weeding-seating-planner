import { useState } from 'react';
import { Dialog, Field } from '../ui';
import { TEMPLATES } from '../../state/model';
import { contentBounds, layoutTables, tableShape } from '../../lib/geometry';

export function EventDialog({ open, onClose, event, onSave }) {
  const [draft, setDraft] = useState(event);
  const save = (e) => {
    e?.preventDefault();
    onSave({ title: draft.title.trim() || 'Nuestra boda', date: draft.date, venue: draft.venue.trim() });
    onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      kicker="El gran día"
      title="Datos del evento"
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={save}>
            Guardar
          </button>
        </>
      }
    >
      <form className="flex flex-col gap-5" onSubmit={save}>
        <Field label="Nombres" htmlFor="ev-title" hint="Usa «&» o «y» entre los nombres para el monograma.">
          <input id="ev-title" data-autofocus className="input font-serif text-[20px]" placeholder="Elena & Pablo" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha" htmlFor="ev-date">
            <input id="ev-date" type="date" className="input" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </Field>
          <Field label="Lugar" htmlFor="ev-venue">
            <input id="ev-venue" className="input" placeholder="Finca El Olivar" value={draft.venue} onChange={(e) => setDraft({ ...draft, venue: e.target.value })} />
          </Field>
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Dialog>
  );
}

function TemplatePreview({ template }) {
  const tables = layoutTables(template.tables, { x: 0, y: 0 });
  const b = contentBounds(tables);
  return (
    <svg viewBox={`${b.x0 - 10} ${b.y0 - 10} ${b.x1 - b.x0 + 20} ${b.y1 - b.y0 + 20}`} className="h-24 w-full">
      {tables.map((t, i) => {
        const s = tableShape(t);
        return (
          <g key={i}>
            {t.shape === 'rect' ? (
              <rect x={t.x - s.width / 2} y={t.y - s.height / 2} width={s.width} height={s.height} rx="8" fill="#FFFDF9" stroke="#CDBFA8" strokeWidth="3" />
            ) : (
              <circle cx={t.x} cy={t.y} r={s.width / 2} fill="#FFFDF9" stroke="#CDBFA8" strokeWidth="3" />
            )}
            {s.seats.map((p, j) => (
              <circle key={j} cx={t.x + p.x} cy={t.y + p.y} r="12" fill="#EFE3CC" />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export function TemplatesDialog({ open, onClose, hasTables, onApply }) {
  return (
    <Dialog open={open} onClose={onClose} kicker="Empieza rápido" title="Distribuciones" width={720}>
      <div className="grid gap-3 sm:grid-cols-3">
        {TEMPLATES.map((t) => (
          <button key={t.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-4 text-left transition-colors hover:border-gold hover:bg-card" onClick={() => onApply(t)}>
            <TemplatePreview template={t} />
            <div>
              <div className="font-serif text-[21px] leading-tight">{t.name}</div>
              <div className="mt-1 text-[12.5px] text-ink-3">{t.description}</div>
            </div>
          </button>
        ))}
      </div>
      <p className="mt-4 text-[12.5px] text-ink-3">
        {hasTables ? 'Sustituye las mesas actuales; los invitados vuelven a la lista sin perder sus datos. Puedes deshacerlo.' : 'Solo crea las mesas: tus invitados y grupos no se tocan.'}
      </p>
    </Dialog>
  );
}

export function ConfirmDialog({ open, title, body, confirmLabel, danger, onConfirm, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      width={420}
      footer={
        <>
          <button className="btn" onClick={onClose} data-autofocus>
            Cancelar
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-[14px] leading-relaxed text-ink-2">{body}</p>
    </Dialog>
  );
}
