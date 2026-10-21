import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus, X } from 'lucide-react';
import { initials } from '../lib/text';
import { toneStyle } from '../lib/colors';

export function Avatar({ name, color, size = 30, className = '' }) {
  return (
    <span className={`avatar ${className}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.36), ...toneStyle(color) }} aria-hidden>
      {initials(name)}
    </span>
  );
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({ open, onClose, title, kicker, children, footer, width = 460 }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const node = ref.current;
    const first = node?.querySelector('[data-autofocus]') ?? node?.querySelector(FOCUSABLE);
    first?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab' && node) {
        const items = [...node.querySelectorAll(FOCUSABLE)];
        if (!items.length) return;
        const [a, b] = [items[0], items[items.length - 1]];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          b.focus();
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" role="presentation">
      <div className="fade-in absolute inset-0 bg-[rgba(30,26,22,0.32)] backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="pop-in relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-card shadow-lift sm:rounded-2xl"
        style={{ maxWidth: width }}
      >
        <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-6">
          <div>
            {kicker && <div className="label mb-2">{kicker}</div>}
            <h2 id={titleId} className="font-serif text-[28px] font-medium leading-none">
              {title}
            </h2>
          </div>
          <button className="icon-btn -mr-2 -mt-1 border-transparent" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="scroll-thin overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line bg-paper px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Field({ label, hint, children, htmlFor }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="text-[12px] text-ink-3">{hint}</p>}
    </div>
  );
}

export function Segmented({ value, onChange, options, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-[10px] border border-line bg-paper p-[3px]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-[7px] py-[7px] text-[12.5px] transition-all ${
            value === o.value ? 'bg-card text-ink shadow-[0_1px_3px_rgba(0,0,0,0.08)]' : 'text-ink-2 hover:text-ink'
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, onChange, min = 1, max = 30, label }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = (v) => {
    const n = Math.round(Number(v));
    if (Number.isFinite(n) && n >= min) onChange(Math.min(n, max));
    else setDraft(String(value));
  };
  return (
    <div className="flex h-10 items-stretch overflow-hidden rounded-[10px] border border-line">
      <button type="button" className="w-11 bg-paper text-ink-2 hover:text-ink disabled:opacity-30" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Quitar ${label}`}>
        <Minus size={15} className="mx-auto" />
      </button>
      <input
        className="w-full min-w-0 border-x border-line bg-card text-center text-[15px] font-medium focus:outline-none"
        inputMode="numeric"
        aria-label={label}
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && commit(e.currentTarget.value)}
      />
      <button type="button" className="w-11 bg-paper text-ink-2 hover:text-ink disabled:opacity-30" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`Añadir ${label}`}>
        <Plus size={15} className="mx-auto" />
      </button>
    </div>
  );
}

/** Menú desplegable con cierre al hacer clic fuera o pulsar Escape. */
export function Menu({ trigger, children, align = 'right', width = 248 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          role="menu"
          className={`pop-in absolute top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-card p-1.5 shadow-lift ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{ width }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon, children, hint, onClick, danger }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] transition-colors hover:bg-paper ${danger ? 'text-danger' : 'text-ink'}`}
    >
      <span className={danger ? 'text-danger' : 'text-ink-3'}>{icon}</span>
      <span className="flex-1">
        {children}
        {hint && <span className="block text-[11.5px] text-ink-3">{hint}</span>}
      </span>
    </button>
  );
}

export const MenuSeparator = () => <div className="my-1.5 h-px bg-line" />;
