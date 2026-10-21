import { useEffect, useState } from 'react';
import { Circle, Copy, Eraser, RectangleHorizontal, Trash2, X } from 'lucide-react';
import { Avatar, Segmented, Stepper } from './ui';
import { MAX_CAPACITY } from '../state/model';

export default function Inspector({ table, seated, groupColor, conflicts, picked, onUpdate, onSeatClick, onUnseat, onEditGuest, onDelete, onDuplicate, onClear, onClose }) {
  const [name, setName] = useState(table.name);
  useEffect(() => setName(table.name), [table.id, table.name]);
  const filled = seated.filter(Boolean).length;
  const commitName = () => {
    const v = name.trim();
    if (v && v !== table.name) onUpdate({ name: v }, 'Renombrar mesa');
    else setName(table.name);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0 flex-1">
          <div className="label">Mesa seleccionada</div>
          <input
            className="mt-1.5 w-full rounded-md bg-transparent font-serif text-[30px] font-medium leading-tight text-ink outline-none hover:bg-paper focus:bg-paper focus:px-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') {
                setName(table.name);
                e.currentTarget.blur();
              }
            }}
            aria-label="Nombre de la mesa"
          />
          <div className="mt-1 text-[12.5px] text-ink-3">
            {filled} de {table.capacity} asientos ocupados
          </div>
        </div>
        <button className="icon-btn -mr-2 border-transparent" onClick={onClose} aria-label="Cerrar panel de mesa">
          <X size={17} />
        </button>
      </div>

      <div className="scroll-thin mt-4 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-5">
        <div className="grid grid-cols-[1fr_128px] gap-3">
          <div className="flex flex-col gap-2">
            <span className="label">Forma</span>
            <Segmented
              label="Forma de la mesa"
              value={table.shape}
              onChange={(shape) => onUpdate({ shape }, 'Cambiar forma')}
              options={[
                { value: 'round', label: 'Redonda', icon: <Circle size={11} className="shrink-0" /> },
                { value: 'rect', label: 'Larga', icon: <RectangleHorizontal size={12} className="shrink-0" /> },
              ]}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="label">Asientos</span>
            <Stepper label="asiento" value={table.capacity} min={1} max={MAX_CAPACITY} onChange={(capacity) => onUpdate({ capacity }, 'Cambiar asientos')} />
          </div>
        </div>

        {conflicts.map((c) => (
          <div key={`${c.a.id}-${c.b.id}`} className="rounded-[10px] border border-[#efd3ba] bg-[#fbf0e6] px-3 py-2.5 text-[12.5px] leading-relaxed text-[#8a4b23]">
            <b>Aviso:</b> {c.a.name} y {c.b.name} están en esta mesa y marcaste que no deberían sentarse juntos.
          </div>
        ))}

        <div className="flex flex-col">
          <span className="label mb-1.5">Comensales</span>
          {seated.map((g, i) =>
            g ? (
              <div key={i} className="group flex items-center gap-2.5 border-b border-paper-2 py-1.5 text-[13.5px]">
                <span className="w-5 text-[11.5px] tabular-nums text-ink-3">{i + 1}</span>
                <button className="flex min-w-0 flex-1 items-center gap-2.5 text-left hover:text-ink-2" onClick={() => onEditGuest(g)}>
                  <Avatar name={g.name} color={groupColor.get(g.groupId)} size={24} />
                  <span className="truncate">{g.name}</span>
                  {g.diet && <span className="shrink-0 text-[11px] text-gold">{g.diet}</span>}
                </button>
                <button className="rounded-md p-1 text-ink-3 opacity-0 hover:bg-paper hover:text-ink focus:opacity-100 group-hover:opacity-100" onClick={() => onUnseat(g)} aria-label={`Quitar a ${g.name} de la mesa`}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                key={i}
                onClick={() => onSeatClick(table, i, null)}
                className={`flex items-center gap-2.5 border-b border-paper-2 py-2 text-left text-[13px] italic ${picked ? 'text-gold hover:text-ink' : 'text-ink-3'}`}
                disabled={!picked}
              >
                <span className="w-5 text-[11.5px] not-italic tabular-nums">{i + 1}</span>
                {picked ? `Sentar a ${picked.name} aquí` : 'Asiento libre'}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="flex gap-2 border-t border-line p-3">
        <button className="btn flex-1" onClick={onDuplicate}>
          <Copy size={14} /> Duplicar
        </button>
        <button className="btn flex-1" onClick={onClear} disabled={!filled}>
          <Eraser size={14} /> Vaciar
        </button>
        <button className="icon-btn text-danger hover:text-danger" onClick={onDelete} aria-label="Eliminar mesa" title="Eliminar mesa (Supr)">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
