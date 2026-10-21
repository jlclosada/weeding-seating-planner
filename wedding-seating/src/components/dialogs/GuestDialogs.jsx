import { useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, Trash2, Upload, X } from 'lucide-react';
import { Avatar, Dialog, Field, Segmented } from '../ui';
import { readGuestFile, splitDuplicates } from '../../lib/importGuests';
import { normalize, plural } from '../../lib/text';
import { PALETTE, RSVP } from '../../state/model';

function GroupSelect({ id, groups, value, onChange, onCreate }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const create = () => {
    const v = name.trim();
    if (!v) return;
    onChange(onCreate(v));
    setName('');
    setCreating(false);
  };
  if (creating) {
    return (
      <div className="flex gap-2">
        <input
          id={id}
          autoFocus
          className="input"
          placeholder="Nombre del grupo, p. ej. «Amigos del cole»"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              create();
            }
            if (e.key === 'Escape') {
              e.stopPropagation();
              setCreating(false);
            }
          }}
        />
        <button type="button" className="btn btn-primary h-10" onClick={create} disabled={!name.trim()}>
          Crear
        </button>
        <button type="button" className="icon-btn h-10 w-10" onClick={() => setCreating(false)} aria-label="Cancelar nuevo grupo">
          <X size={15} />
        </button>
      </div>
    );
  }
  return (
    <select
      id={id}
      className="input"
      value={value ?? ''}
      onChange={(e) => (e.target.value === '__new__' ? setCreating(true) : onChange(e.target.value || null))}
    >
      <option value="">Sin grupo</option>
      {groups.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
      {onCreate && <option value="__new__">+ Nuevo grupo…</option>}
    </select>
  );
}

export function AddGuestsDialog({ open, onClose, doc, onSubmit, onCreateGroup }) {
  const [text, setText] = useState('');
  const [groupId, setGroupId] = useState(doc.groups[0]?.id ?? null);
  const [allowDupes, setAllowDupes] = useState(false);

  const entries = useMemo(() => text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((name) => ({ name })), [text]);
  const { fresh, duplicates } = useMemo(() => splitDuplicates(entries, doc.guests), [entries, doc.guests]);
  const toAdd = allowDupes ? entries : fresh;

  const submit = () => {
    if (!toAdd.length) return;
    onSubmit(toAdd.map((e) => ({ name: e.name, groupId })));
    setText('');
    setAllowDupes(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      kicker="Lista de invitados"
      title="Añadir invitados"
      width={520}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={!toAdd.length}>
            {toAdd.length ? `Añadir ${plural(toAdd.length, 'invitado', 'invitados')}` : 'Añadir'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Nombres · uno por línea" htmlFor="guest-names" hint="Puedes pegar directamente una columna de Excel o de una nota.">
          <textarea
            id="guest-names"
            data-autofocus
            className="input h-44 resize-none py-2.5 leading-relaxed"
            placeholder={'Ana García\nCarlos López\nMaría Martínez'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && submit()}
          />
        </Field>
        <Field label="Grupo" htmlFor="guest-group">
          <GroupSelect id="guest-group" groups={doc.groups} value={groupId} onChange={setGroupId} onCreate={onCreateGroup} />
        </Field>
        {duplicates.length > 0 && (
          <div className="rounded-[10px] border border-line bg-paper px-3.5 py-3 text-[12.5px] text-ink-2">
            <p>
              {plural(duplicates.length, 'nombre ya está', 'nombres ya están')} en la lista: <span className="text-ink">{duplicates.slice(0, 4).map((d) => d.name).join(', ')}{duplicates.length > 4 ? '…' : ''}</span>
            </p>
            <label className="mt-2 flex items-center gap-2 text-ink">
              <input type="checkbox" checked={allowDupes} onChange={(e) => setAllowDupes(e.target.checked)} className="accent-[var(--gold)]" />
              Añadirlos igualmente (son personas distintas)
            </label>
          </div>
        )}
      </div>
    </Dialog>
  );
}

export function ImportDialog({ open, onClose, doc, onSubmit }) {
  const [entries, setEntries] = useState(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const input = useRef(null);

  const reset = () => {
    setEntries(null);
    setFileName('');
    setError('');
  };
  const close = () => {
    reset();
    onClose();
  };

  const load = async (file) => {
    if (!file) return;
    setError('');
    setFileName(file.name);
    try {
      const parsed = await readGuestFile(file);
      if (!parsed.length) throw new Error('No se han encontrado nombres en el archivo');
      setEntries(parsed);
    } catch (err) {
      setEntries(null);
      setError(err.message || 'No se ha podido leer el archivo');
    }
  };

  const split = useMemo(() => (entries ? splitDuplicates(entries, doc.guests) : null), [entries, doc.guests]);
  const newGroups = useMemo(() => {
    if (!split) return [];
    const known = new Set(doc.groups.map((g) => normalize(g.name)));
    return [...new Set(split.fresh.map((e) => e.group).filter((g) => g && !known.has(normalize(g))))];
  }, [split, doc.groups]);

  const submit = () => {
    onSubmit(split.fresh, newGroups);
    close();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      kicker="Excel o CSV"
      title="Importar invitados"
      width={540}
      footer={
        <>
          <button className="btn" onClick={close}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={!split?.fresh.length} onClick={submit}>
            {split?.fresh.length ? `Importar ${plural(split.fresh.length, 'invitado', 'invitados')}` : 'Importar'}
          </button>
        </>
      }
    >
      {!entries ? (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            data-autofocus
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              load(e.dataTransfer.files[0]);
            }}
            className={`flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center transition-colors ${dragOver ? 'border-gold bg-gold-soft' : 'border-line-2 bg-paper hover:border-gold'}`}
          >
            <Upload size={22} className="text-gold" />
            <span className="font-serif text-[22px] italic">Suelta aquí tu archivo</span>
            <span className="text-[12.5px] text-ink-3">o haz clic para elegirlo · .xlsx, .xls o .csv</span>
          </button>
          <input ref={input} type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden" onChange={(e) => load(e.target.files[0])} />
          {error && <p className="text-[13px] text-danger">{error}</p>}
          <div className="rounded-[10px] border border-line px-4 py-3 text-[12.5px] leading-relaxed text-ink-2">
            <p className="mb-1 font-medium text-ink">Formato</p>
            Una columna con los nombres. Opcionalmente, una fila de cabecera con <b>Nombre</b>, <b>Grupo</b> y <b>Dieta</b>: los grupos que no existan se crearán.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-[10px] border border-line bg-paper px-3.5 py-3">
            <FileSpreadsheet size={18} className="text-ok" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px]">{fileName}</div>
              <div className="text-[12px] text-ink-3">
                {plural(split.fresh.length, 'invitado nuevo', 'invitados nuevos')}
                {split.duplicates.length ? ` · ${split.duplicates.length} ya en la lista (se omiten)` : ''}
                {newGroups.length ? ` · ${plural(newGroups.length, 'grupo nuevo', 'grupos nuevos')}` : ''}
              </div>
            </div>
            <button className="icon-btn border-transparent" onClick={reset} aria-label="Elegir otro archivo">
              <X size={15} />
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto rounded-[10px] border border-line">
            {split.fresh.slice(0, 50).map((e, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-paper-2 px-3.5 py-2 text-[13px] last:border-0">
                <span className="flex-1 truncate">{e.name}</span>
                {e.group && <span className="text-[12px] text-ink-3">{e.group}</span>}
                {e.diet && <span className="text-[11.5px] text-gold">{e.diet}</span>}
              </div>
            ))}
            {split.fresh.length > 50 && <div className="px-3.5 py-2 text-[12px] text-ink-3">y {split.fresh.length - 50} más…</div>}
          </div>
        </div>
      )}
    </Dialog>
  );
}

export function EditGuestDialog({ guest, doc, onClose, onSave, onDelete, onUnseat, onCreateGroup }) {
  const [draft, setDraft] = useState(() => ({ name: guest.name, groupId: guest.groupId, diet: guest.diet, note: guest.note, rsvp: guest.rsvp ?? 'pending' }));
  const [avoid, setAvoid] = useState(() => doc.avoid.filter((p) => p.includes(guest.id)).map(([a, b]) => (a === guest.id ? b : a)));
  const [search, setSearch] = useState('');
  const table = doc.tables.find((t) => t.id === guest.tableId);
  const groupColor = new Map(doc.groups.map((g) => [g.id, g.color]));
  const guestById = new Map(doc.guests.map((g) => [g.id, g]));
  const suggestions = search
    ? doc.guests.filter((g) => g.id !== guest.id && !avoid.includes(g.id) && normalize(g.name).includes(normalize(search))).slice(0, 6)
    : [];

  const save = () => {
    if (!draft.name.trim()) return;
    onSave(draft, avoid);
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      kicker={table ? `${table.name} · asiento ${guest.seat + 1}` : 'Sin mesa'}
      title="Editar invitado"
      width={500}
      footer={
        <>
          <button className="btn mr-auto text-danger hover:text-danger" onClick={() => (onDelete(guest), onClose())}>
            <Trash2 size={14} /> Eliminar
          </button>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={save} disabled={!draft.name.trim()}>
            Guardar
          </button>
        </>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Nombre" htmlFor="edit-name">
          <input id="edit-name" data-autofocus className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="Asistencia">
          <Segmented label="Asistencia" value={draft.rsvp} onChange={(rsvp) => setDraft({ ...draft, rsvp })} options={Object.entries(RSVP).map(([value, label]) => ({ value, label }))} />
          {draft.rsvp === 'no' && table && <p className="text-[12px] text-ink-3">Al guardar dejará libre su asiento en {table.name}.</p>}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Grupo" htmlFor="edit-group">
            <GroupSelect id="edit-group" groups={doc.groups} value={draft.groupId} onChange={(groupId) => setDraft({ ...draft, groupId })} onCreate={onCreateGroup} />
          </Field>
          <Field label="Menú / dieta" htmlFor="edit-diet">
            <input id="edit-diet" className="input" list="diet-options" placeholder="Ej. Vegetariano" value={draft.diet} onChange={(e) => setDraft({ ...draft, diet: e.target.value })} />
            <datalist id="diet-options">
              {['Vegetariano', 'Vegano', 'Sin gluten', 'Sin lactosa', 'Menú infantil', 'Alergia frutos secos'].map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </Field>
        </div>
        <Field label="Notas" htmlFor="edit-note">
          <input id="edit-note" className="input" placeholder="Ej. Llega después de la ceremonia" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
        </Field>
        <Field label="No sentar en la misma mesa que" htmlFor="edit-avoid">
          {avoid.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {avoid.map((id) => {
                const g = guestById.get(id);
                if (!g) return null;
                return (
                  <span key={id} className="chip pr-1">
                    <Avatar name={g.name} color={groupColor.get(g.groupId)} size={18} />
                    {g.name}
                    <button type="button" className="rounded-full p-0.5 hover:bg-paper-2" onClick={() => setAvoid(avoid.filter((x) => x !== id))} aria-label={`Quitar a ${g.name}`}>
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          <div className="relative">
            <input id="edit-avoid" className="input" placeholder="Busca un invitado…" value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" />
            {suggestions.length > 0 && (
              <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-[10px] border border-line bg-card shadow-lift">
                {suggestions.map((g) => (
                  <button
                    type="button"
                    key={g.id}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-paper"
                    onClick={() => {
                      setAvoid([...avoid, g.id]);
                      setSearch('');
                    }}
                  >
                    <Avatar name={g.name} color={groupColor.get(g.groupId)} size={22} />
                    {g.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Field>
        {table && (
          <button type="button" className="btn self-start" onClick={() => (onUnseat(guest), onClose())}>
            Quitar de {table.name}
          </button>
        )}
      </form>
    </Dialog>
  );
}

export function GroupsDialog({ open, onClose, doc, dispatch }) {
  const [name, setName] = useState('');
  const used = new Set(doc.groups.map((g) => g.color));
  const nextColor = PALETTE.find((c) => !used.has(c)) ?? PALETTE[doc.groups.length % PALETTE.length];
  const counts = new Map();
  for (const g of doc.guests) counts.set(g.groupId, (counts.get(g.groupId) ?? 0) + 1);

  const add = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    dispatch({ type: 'group/add', name, color: nextColor, label: 'Crear grupo' });
    setName('');
  };

  return (
    <Dialog open={open} onClose={onClose} kicker="Colores del plano" title="Grupos" width={520} footer={<button className="btn btn-primary" onClick={onClose}>Hecho</button>}>
      <div className="flex flex-col gap-1">
        {doc.groups.map((g) => (
          <div key={g.id} className="flex items-center gap-3 border-b border-paper-2 py-2.5">
            <ColorPicker value={g.color} onChange={(color) => dispatch({ type: 'group/update', id: g.id, patch: { color }, label: 'Cambiar color' })} />
            <input
              key={g.name}
              className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-1 text-[14px] outline-none hover:bg-paper focus:bg-paper"
              defaultValue={g.name}
              aria-label="Nombre del grupo"
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== g.name) dispatch({ type: 'group/update', id: g.id, patch: { name: v }, label: 'Renombrar grupo' });
                else e.target.value = g.name;
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
            <span className="text-[12px] text-ink-3">{plural(counts.get(g.id) ?? 0, 'persona', 'personas')}</span>
            <button className="icon-btn h-8 w-8 border-transparent hover:text-danger" onClick={() => dispatch({ type: 'group/delete', id: g.id, label: 'Eliminar grupo' })} aria-label={`Eliminar grupo ${g.name}`}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <form className="mt-4 flex gap-2" onSubmit={add}>
        <span className="mt-2.5 h-5 w-5 shrink-0 rounded-full" style={{ background: nextColor }} />
        <input className="input" placeholder="Nuevo grupo, p. ej. «Amigos del cole»" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary h-10" disabled={!name.trim()}>
          Crear
        </button>
      </form>
      <p className="mt-3 text-[12px] text-ink-3">Al eliminar un grupo, sus invitados pasan a «Sin grupo». Puedes deshacerlo.</p>
    </Dialog>
  );
}

function ColorPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button className="h-6 w-6 rounded-full border-2 border-card shadow-[0_0_0_1px_var(--line-2)]" style={{ background: value }} onClick={() => setOpen(!open)} aria-label="Cambiar color" />
      {open && (
        <div className="pop-in absolute left-0 top-8 z-20 grid w-[184px] grid-cols-5 gap-2 rounded-xl border border-line bg-card p-3 shadow-lift">
          {PALETTE.map((c) => (
            <button
              key={c}
              className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${c === value ? 'ring-2 ring-ink ring-offset-2 ring-offset-card' : ''}`}
              style={{ background: c }}
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
