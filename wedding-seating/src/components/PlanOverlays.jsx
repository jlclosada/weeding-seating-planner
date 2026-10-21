import { Check, LayoutTemplate, Pencil, Plus, Sparkles, UserPlus, Wand2, X } from 'lucide-react';
import { Avatar } from './ui';

export function EmptyState({ guests, onAddGuests, onTemplates, onAddTable, onDemo }) {
  const steps = [
    { done: guests > 0, title: 'Tu lista de invitados', text: guests ? `${guests} añadidos` : 'Pégala o impórtala desde Excel', action: onAddGuests, cta: guests ? 'Añadir más' : 'Añadir', icon: <UserPlus size={14} /> },
    { done: false, title: 'Dibuja el salón', text: 'Elige una distribución o crea mesas una a una', action: onTemplates, cta: 'Distribuciones', icon: <LayoutTemplate size={14} />, alt: onAddTable },
    { done: false, title: 'Sienta a cada invitado', text: 'Arrastra desde la lista o deja que lo hagamos por ti', icon: <Wand2 size={14} /> },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
      <div className="pop-in pointer-events-auto w-full max-w-[460px] rounded-3xl border border-line bg-card p-7 shadow-lift backdrop-blur" onPointerDown={(e) => e.stopPropagation()}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold font-serif text-[22px] italic text-gold">&amp;</div>
        <h2 className="mt-4 text-center font-serif text-[32px] font-medium leading-tight">Empecemos el plano</h2>
        <p className="mt-1 text-center text-[13.5px] text-ink-3">Tres pasos y cada invitado tendrá su sitio.</p>
        <ol className="mt-6 flex flex-col gap-2">
          {steps.map((s, i) => (
            <li key={s.title} className="flex items-center gap-3.5 rounded-2xl border border-line px-4 py-3">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${s.done ? 'bg-ok text-white' : 'border border-line-2 text-ink-3'}`}>{s.done ? <Check size={14} /> : i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium">{s.title}</span>
                <span className="block text-[12px] text-ink-3">{s.text}</span>
              </span>
              {s.action && (
                <span className="flex gap-1.5">
                  {s.alt && (
                    <button className="icon-btn h-8 w-8" onClick={s.alt} aria-label="Añadir una mesa" title="Añadir una mesa">
                      <Plus size={14} />
                    </button>
                  )}
                  <button className={`btn h-8 px-3 text-[12.5px] ${!s.done && i === (guests ? 1 : 0) ? 'btn-primary' : ''}`} onClick={s.action}>
                    {s.icon}
                    {s.cta}
                  </button>
                </span>
              )}
            </li>
          ))}
        </ol>
        <button className="mx-auto mt-5 flex items-center gap-1.5 text-[12.5px] text-ink-3 hover:text-gold" onClick={onDemo}>
          <Sparkles size={13} /> Ver una boda de ejemplo
        </button>
      </div>
    </div>
  );
}

export function PickBanner({ guest, color, table, onCancel, onUnseat, onEdit }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-3">
      <div className="slide-up pointer-events-auto flex max-w-full items-center gap-3 rounded-2xl border border-gold bg-card py-2 pl-2 pr-2 shadow-lift" onPointerDown={(e) => e.stopPropagation()}>
        <Avatar name={guest.name} color={color} size={34} />
        <div className="min-w-0">
          <div className="truncate text-[14px] font-medium">{guest.name}</div>
          <div className="truncate text-[12px] text-ink-3">{table ? `${table.name} · asiento ${guest.seat + 1} — toca otro asiento para moverle` : 'Toca un asiento libre para sentarle'}</div>
        </div>
        <div className="ml-1 flex shrink-0 gap-1">
          <button className="icon-btn h-8 w-8" onClick={onEdit} aria-label="Editar invitado" title="Editar">
            <Pencil size={14} />
          </button>
          {table && (
            <button className="btn h-8 px-2.5 text-[12.5px]" onClick={onUnseat}>
              Quitar
            </button>
          )}
          <button className="icon-btn h-8 w-8 border-transparent" onClick={onCancel} aria-label="Cancelar selección" title="Cancelar (Esc)">
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AutoSeatPill({ count, onClick }) {
  return (
    <div className="absolute left-4 top-4 z-10 hidden lg:block" onPointerDown={(e) => e.stopPropagation()}>
      <button className="flex h-10 items-center gap-2 rounded-xl border border-line bg-card px-3.5 text-[13px] font-medium shadow-float transition-colors hover:border-gold" onClick={onClick}>
        <Wand2 size={15} className="text-gold" />
        Sentar automáticamente
        <span className="rounded-full bg-paper-2 px-2 py-0.5 text-[11px] text-ink-2">{count}</span>
      </button>
    </div>
  );
}
