import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardList, LayoutGrid, PieChart, Users } from 'lucide-react';
import { StoreProvider, useStore } from './state/store';
import { ToastProvider, useToast } from './components/Toasts';
import TopBar from './components/TopBar';
import { VIEWS } from './lib/views';
import GuestPanel from './components/GuestPanel';
import Canvas from './components/Canvas';
import Inspector from './components/Inspector';
import GuestsView from './components/GuestsView';
import SummaryView from './components/SummaryView';
import PlanningView from './components/PlanningView';
import MobileSheet from './components/MobileSheet';
import { AutoSeatPill, EmptyState, PickBanner } from './components/PlanOverlays';
import { Avatar } from './components/ui';
import { AddGuestsDialog, EditGuestDialog, GroupsDialog, ImportDialog } from './components/dialogs/GuestDialogs';
import { ConfirmDialog, EventDialog, TemplatesDialog } from './components/dialogs/PlanDialogs';
import { useMediaQuery } from './hooks/useMediaQuery';
import { analyze, autoAssign } from './lib/autoAssign';
import { findFreeSpot, layoutTables } from './lib/geometry';
import { exportBackup, exportExcel, exportPDF, exportPlaceCards, readBackup } from './lib/exporters';
import { buildDemoDoc } from './lib/demo';
import { normalize, plural } from './lib/text';
import { PALETTE, createEmptyDoc, makeGuest, makeTable, uid } from './state/model';

const VIEW_ICONS = { plan: LayoutGrid, guests: Users, summary: PieChart, planning: ClipboardList };
const isTyping = (el) => el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

function nextTableName(tables) {
  const used = new Set(tables.map((t) => t.name));
  const numbers = tables.map((t) => Number(/^Mesa (\d+)$/.exec(t.name)?.[1] ?? 0));
  let n = Math.max(0, ...numbers) + 1;
  while (used.has(`Mesa ${n}`)) n++;
  return `Mesa ${n}`;
}

function Planner() {
  const store = useStore();
  const { doc, dispatch, undo, redo } = store;
  const toast = useToast();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const [view, setView] = useState('plan');
  const [planningSection, setPlanningSection] = useState('budget');
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [pickedGuestId, setPickedGuestId] = useState(null);
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState(null);
  const [drag, setDrag] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const canvas = useRef(null);
  const ghost = useRef(null);
  const backupInput = useRef(null);
  const docRef = useRef(doc);
  docRef.current = doc;

  // ---------- Datos derivados ----------
  const groupColor = useMemo(() => new Map(doc.groups.map((g) => [g.id, g.color])), [doc.groups]);
  const tableById = useMemo(() => new Map(doc.tables.map((t) => [t.id, t])), [doc.tables]);
  const guestById = useMemo(() => new Map(doc.guests.map((g) => [g.id, g])), [doc.guests]);
  const seatsByTable = useMemo(() => {
    const m = new Map(doc.tables.map((t) => [t.id, Array(t.capacity).fill(null)]));
    for (const g of doc.guests) if (g.tableId != null && m.has(g.tableId)) m.get(g.tableId)[g.seat] = g;
    return m;
  }, [doc.tables, doc.guests]);
  const analysis = useMemo(() => analyze(doc), [doc]);
  const conflictTables = useMemo(() => new Set(analysis.conflicts.map((c) => c.tableId)), [analysis]);

  const selectedTable = tableById.get(selectedTableId) ?? null;
  const pickedGuest = guestById.get(pickedGuestId) ?? null;
  const unseatedCount = doc.guests.filter((g) => g.tableId == null && g.rsvp !== 'no').length;

  const withUndo = useCallback((message) => toast.show(message, { action: { label: 'Deshacer', onClick: undo } }), [toast, undo]);
  const openDialog = (type, payload) => setDialog({ type, payload });
  const closeDialog = useCallback(() => setDialog(null), []);

  // ---------- Mesas ----------
  const addTable = useCallback(() => {
    setView('plan');
    const tables = docRef.current.tables;
    const spec = { shape: 'round', capacity: 10 };
    const pos = findFreeSpot(tables, spec, canvas.current?.viewCenter() ?? { x: 600, y: 300 });
    const table = makeTable({ ...spec, ...pos, name: nextTableName(tables) });
    dispatch({ type: 'table/add', table, label: 'Añadir mesa' });
    setSelectedTableId(table.id);
    requestAnimationFrame(() => canvas.current?.reveal(table));
  }, [dispatch]);

  const updateTable = useCallback(
    (patch, label) => {
      if (!selectedTable) return;
      const lost = 'capacity' in patch ? seatsByTable.get(selectedTable.id).slice(patch.capacity).filter(Boolean).length : 0;
      dispatch({ type: 'table/update', id: selectedTable.id, patch, label });
      if (lost) withUndo(`${plural(lost, 'invitado vuelve', 'invitados vuelven')} a la lista`);
    },
    [dispatch, selectedTable, seatsByTable, withUndo],
  );

  const deleteTable = useCallback(
    (id) => {
      const t = tableById.get(id);
      if (!t) return;
      const n = seatsByTable.get(id).filter(Boolean).length;
      dispatch({ type: 'table/delete', id, label: 'Eliminar mesa' });
      setSelectedTableId(null);
      withUndo(`${t.name} eliminada${n ? ` · ${plural(n, 'invitado vuelve', 'invitados vuelven')} a la lista` : ''}`);
    },
    [dispatch, seatsByTable, tableById, withUndo],
  );

  const duplicateTable = useCallback(() => {
    if (!selectedTable) return;
    const spec = { shape: selectedTable.shape, capacity: selectedTable.capacity };
    const pos = findFreeSpot(doc.tables, spec, { x: selectedTable.x + 60, y: selectedTable.y });
    const table = makeTable({ ...spec, ...pos, name: nextTableName(doc.tables) });
    dispatch({ type: 'table/add', table, label: 'Duplicar mesa' });
    setSelectedTableId(table.id);
    requestAnimationFrame(() => canvas.current?.reveal(table));
  }, [dispatch, doc.tables, selectedTable]);

  const clearTable = useCallback(() => {
    if (!selectedTable) return;
    dispatch({ type: 'table/clearSeats', id: selectedTable.id, label: 'Vaciar mesa' });
    withUndo(`${selectedTable.name} vaciada`);
  }, [dispatch, selectedTable, withUndo]);

  const focusTable = useCallback((id) => {
    setView('plan');
    setSelectedTableId(id);
    setTimeout(() => canvas.current?.centerOn(docRef.current.tables.find((t) => t.id === id)), 60);
  }, []);

  // ---------- Sentar ----------
  const assign = useCallback((guestId, tableId, seat) => dispatch({ type: 'seat/assign', guestId, tableId, seat, label: 'Sentar invitado' }), [dispatch]);

  const onSeatClick = useCallback(
    (table, seat, guest) => {
      setSelectedTableId(table.id);
      if (pickedGuestId != null) {
        if (guest?.id === pickedGuestId) return setPickedGuestId(null);
        assign(pickedGuestId, table.id, seat);
        setPickedGuestId(null);
        navigator.vibrate?.(8);
      } else if (guest) {
        setPickedGuestId(guest.id);
      }
    },
    [assign, pickedGuestId],
  );

  const onPick = useCallback(
    (guest) => {
      if (pickedGuestId === guest.id) return setPickedGuestId(null);
      setPickedGuestId(guest.id);
      if (guest.tableId != null) {
        setSelectedTableId(guest.tableId);
        canvas.current?.reveal(docRef.current.tables.find((t) => t.id === guest.tableId));
      }
    },
    [pickedGuestId],
  );

  const unseat = useCallback(
    (guest) => {
      dispatch({ type: 'seat/unassign', guestId: guest.id, label: 'Quitar de la mesa' });
      setPickedGuestId(null);
    },
    [dispatch],
  );

  const autoSeat = useCallback(() => {
    const current = docRef.current;
    if (!current.guests.some((g) => g.tableId == null && g.rsvp !== 'no')) return toast.show('Todos tus invitados ya tienen sitio');
    const r = autoAssign(current, { near: canvas.current?.viewCenter() });
    dispatch({ type: 'seats/apply', guests: r.guests, tables: r.tables, label: 'Sentar automáticamente' });
    setView('plan');
    withUndo(`${plural(r.seated, 'invitado sentado', 'invitados sentados')}${r.created.length ? ` · ${plural(r.created.length, 'mesa nueva', 'mesas nuevas')}` : ''}`);
    if (r.created.length) setTimeout(() => canvas.current?.fit(), 80);
  }, [dispatch, toast, withUndo]);

  const clearAllSeats = useCallback(() => {
    if (!docRef.current.guests.some((g) => g.tableId != null)) return;
    dispatch({ type: 'seats/clearAll', label: 'Levantar a todos' });
    withUndo('Todos los invitados vuelven a la lista');
  }, [dispatch, withUndo]);

  // ---------- Arrastrar invitados (ratón) ----------
  const beginGuestDrag = useCallback(
    (e, guestId) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      const start = { x: e.clientX, y: e.clientY };
      let active = false;
      let target = null;
      const sameTarget = (a, b) => a === b || (a && b && a.list === b.list && a.tableId === b.tableId && a.seat === b.seat);

      const move = (ev) => {
        if (!active) {
          if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 5) return;
          active = true;
          document.body.style.cursor = 'grabbing';
          setDrag({ guestId });
        }
        if (ghost.current) ghost.current.style.transform = `translate(${ev.clientX + 10}px, ${ev.clientY + 10}px)`;
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const seatEl = el?.closest('[data-seat]');
        const next = seatEl ? { tableId: seatEl.dataset.tableId, seat: Number(seatEl.dataset.seat) } : el?.closest('[data-dropzone="list"]') ? { list: true } : null;
        if (!sameTarget(next, target)) {
          target = next;
          setDropTarget(next);
        }
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        document.body.style.cursor = '';
        if (active) {
          const swallow = (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
          };
          window.addEventListener('click', swallow, { capture: true, once: true });
          setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
          const current = docRef.current;
          if (target?.list) {
            if (current.guests.find((g) => g.id === guestId)?.tableId != null) dispatch({ type: 'seat/unassign', guestId, label: 'Quitar de la mesa' });
          } else if (target) {
            const table = current.tables.find((t) => String(t.id) === target.tableId);
            if (table) {
              assign(guestId, table.id, target.seat);
              setSelectedTableId(table.id);
            }
          }
          setPickedGuestId(null);
        }
        setDrag(null);
        setDropTarget(null);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [assign, dispatch],
  );

  // ---------- Invitados ----------
  const addGuests = useCallback(
    (entries) => {
      const guests = entries.map((e) => makeGuest(e.name, e.groupId ?? null, { diet: e.diet ?? '' }));
      dispatch({ type: 'guests/add', guests, label: 'Añadir invitados' });
      withUndo(`${plural(guests.length, 'invitado añadido', 'invitados añadidos')}`);
    },
    [dispatch, withUndo],
  );

  const createGroup = useCallback(
    (name) => {
      const used = new Set(docRef.current.groups.map((g) => g.color));
      const color = PALETTE.find((c) => !used.has(c)) ?? PALETTE[docRef.current.groups.length % PALETTE.length];
      const id = uid();
      dispatch({ type: 'group/add', id, name, color, label: 'Crear grupo' });
      toast.show(`Grupo «${name.trim()}» creado`);
      return id;
    },
    [dispatch, toast],
  );

  const importGuests = useCallback(
    (entries, newGroupNames) => {
      const used = new Set(doc.groups.map((g) => g.color));
      const free = PALETTE.filter((c) => !used.has(c));
      const groups = newGroupNames.map((name, i) => ({ id: uid(), name, color: free[i] ?? PALETTE[(doc.groups.length + i) % PALETTE.length] }));
      const byName = new Map([...doc.groups, ...groups].map((g) => [normalize(g.name), g.id]));
      const guests = entries.map((e) => makeGuest(e.name, e.group ? byName.get(normalize(e.group)) ?? null : null, { diet: e.diet ?? '' }));
      dispatch({ type: 'guests/add', guests, groups, label: 'Importar invitados' });
      withUndo(`${plural(guests.length, 'invitado importado', 'invitados importados')}`);
    },
    [dispatch, doc.groups, withUndo],
  );

  const deleteGuest = useCallback(
    (guest) => {
      dispatch({ type: 'guests/delete', ids: [guest.id], label: 'Eliminar invitado' });
      if (pickedGuestId === guest.id) setPickedGuestId(null);
      withUndo(`${guest.name} eliminado de la lista`);
    },
    [dispatch, pickedGuestId, withUndo],
  );

  const saveGuest = useCallback((guest, patch, avoid) => dispatch({ type: 'guest/save', id: guest.id, patch, avoid, label: 'Editar invitado' }), [dispatch]);
  const editGuest = useCallback((guest) => setDialog({ type: 'editGuest', payload: guest.id }), []);

  const seatAtTable = useCallback(
    (guest, tableIdStr) => {
      if (!tableIdStr) return dispatch({ type: 'seat/unassign', guestId: guest.id, label: 'Quitar de la mesa' });
      const table = doc.tables.find((t) => String(t.id) === tableIdStr);
      if (table) dispatch({ type: 'seat/assignAny', guestId: guest.id, tableId: table.id, label: 'Sentar invitado' });
    },
    [dispatch, doc.tables],
  );

  // ---------- Plano completo ----------
  const replaceDoc = useCallback(
    (next, message) => {
      dispatch({ type: 'doc/replace', doc: next, label: message });
      setSelectedTableId(null);
      setPickedGuestId(null);
      setView('plan');
      setTimeout(() => canvas.current?.fit(), 60);
      withUndo(message);
    },
    [dispatch, withUndo],
  );

  const hasContent = doc.tables.length > 0 || doc.guests.length > 0;
  const confirmThen = (title, body, confirmLabel, fn, danger = false) => (hasContent ? openDialog('confirm', { title, body, confirmLabel, onConfirm: fn, danger }) : fn());

  const applyTemplate = (t) => {
    const tables = layoutTables(t.tables, { x: 600, y: 120 }).map((spec) => makeTable(spec));
    const hadTables = doc.tables.length > 0;
    dispatch({ type: 'tables/replace', tables, label: 'Aplicar distribución' });
    closeDialog();
    setSelectedTableId(null);
    setView('plan');
    setTimeout(() => canvas.current?.fit(), 60);
    if (hadTables) withUndo(`Distribución «${t.name}» aplicada · invitados de vuelta en la lista`);
    else toast.show(`Distribución «${t.name}» lista`);
  };

  const runExport = async (fn, label) => {
    const id = toast.show(`Preparando ${label}…`, { duration: 20000 });
    try {
      await fn(docRef.current);
      toast.dismiss(id);
      toast.show(`${label} descargado`);
    } catch (err) {
      console.error(err);
      toast.dismiss(id);
      toast.show(`No se pudo generar el ${label}`, { tone: 'error' });
    }
  };

  const actions = {
    addTable,
    autoSeat,
    clearAllSeats,
    editEvent: () => openDialog('event'),
    openGroups: () => openDialog('groups'),
    openPlanning: (section) => {
      setPlanningSection(section);
      setView('planning');
    },
    openTemplates: () => openDialog('templates'),
    exportPDF: () => runExport(exportPDF, 'PDF'),
    exportExcel: () => runExport(exportExcel, 'Excel'),
    exportCards: () => runExport(exportPlaceCards, 'PDF de tarjetas'),
    exportBackup: () => exportBackup(doc),
    importBackup: () => backupInput.current?.click(),
    loadDemo: () => confirmThen('¿Cargar la boda de ejemplo?', 'Sustituye tu plano actual por uno de ejemplo. Podrás deshacerlo, pero guarda antes una copia si quieres conservarlo.', 'Cargar ejemplo', () => replaceDoc(buildDemoDoc(), 'Boda de ejemplo cargada')),
    resetAll: () => confirmThen('¿Empezar de cero?', 'Se borran todas las mesas, invitados y grupos. Podrás deshacerlo mientras no cierres la página.', 'Borrar todo', () => replaceDoc(createEmptyDoc(), 'Plano vaciado'), true),
  };

  const onBackupFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = await readBackup(file);
      confirmThen('¿Restaurar esta copia?', `Sustituye tu plano por «${file.name}» (${plural(data.guests.length, 'invitado', 'invitados')}, ${plural(data.tables.length, 'mesa', 'mesas')}).`, 'Restaurar', () => replaceDoc(data, 'Copia restaurada'));
    } catch (err) {
      toast.show(err.message || 'No se pudo leer la copia', { tone: 'error' });
    }
  };

  // ---------- Atajos de teclado ----------
  useEffect(() => {
    const onKey = (e) => {
      if (dialog || isTyping(document.activeElement)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (mod) {
        return;
      } else if (e.key === 'Escape') {
        if (pickedGuestId != null) setPickedGuestId(null);
        else setSelectedTableId(null);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTableId != null && view === 'plan') {
        e.preventDefault();
        deleteTable(selectedTableId);
      } else if (view === 'plan' && e.key.toLowerCase() === 'f') canvas.current?.fit();
      else if (view === 'plan' && (e.key === '+' || e.key === '=')) canvas.current?.zoomBy(1.2);
      else if (view === 'plan' && e.key === '-') canvas.current?.zoomBy(1 / 1.2);
      else if (e.key.toLowerCase() === 'n') addTable();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addTable, deleteTable, dialog, pickedGuestId, redo, selectedTableId, undo, view]);

  useEffect(() => {
    if (store.bootSource === 'migrated') toast.show('Hemos actualizado tu plano al nuevo diseño. Tus datos siguen aquí.', { duration: 6000 });
  }, [store.bootSource, toast]);

  // ---------- Render ----------
  const inspector = selectedTable && (
    <Inspector
      table={selectedTable}
      seated={seatsByTable.get(selectedTable.id)}
      groupColor={groupColor}
      conflicts={analysis.conflicts.filter((c) => c.tableId === selectedTable.id)}
      picked={pickedGuest}
      onUpdate={updateTable}
      onSeatClick={onSeatClick}
      onUnseat={unseat}
      onEditGuest={editGuest}
      onDelete={() => deleteTable(selectedTable.id)}
      onDuplicate={duplicateTable}
      onClear={clearTable}
      onClose={() => setSelectedTableId(null)}
    />
  );

  const plan = (
    <div className="relative h-full min-h-0 overflow-hidden">
      <Canvas
        ref={canvas}
        tables={doc.tables}
        seatsByTable={seatsByTable}
        groupColor={groupColor}
        selectedTableId={selectedTableId}
        conflictTables={conflictTables}
        dropTarget={dropTarget}
        picking={pickedGuestId != null || drag != null}
        query={query}
        dispatch={dispatch}
        onSeatClick={onSeatClick}
        onSeatPointerDown={beginGuestDrag}
        onTableSelect={setSelectedTableId}
        onBackgroundClick={() => {
          setSelectedTableId(null);
          setPickedGuestId(null);
        }}
        insets={isDesktop ? { top: 64, right: selectedTable ? 340 : 0, bottom: 24, left: 0 } : { top: 70, right: 0, bottom: 140, left: 0 }}
      >
        {!doc.tables.length && <EmptyState guests={doc.guests.length} onAddGuests={() => openDialog('addGuests')} onTemplates={actions.openTemplates} onAddTable={addTable} onDemo={actions.loadDemo} />}
        {pickedGuest && (
          <PickBanner
            guest={pickedGuest}
            color={groupColor.get(pickedGuest.groupId)}
            table={tableById.get(pickedGuest.tableId)}
            onCancel={() => setPickedGuestId(null)}
            onUnseat={() => unseat(pickedGuest)}
            onEdit={() => editGuest(pickedGuest)}
          />
        )}
        {!pickedGuest && unseatedCount > 0 && doc.tables.length > 0 && <AutoSeatPill count={unseatedCount} onClick={autoSeat} />}
      </Canvas>
      {isDesktop && selectedTable && (
        <div key={selectedTable.id} className="slide-left panel absolute bottom-4 right-4 top-4 z-20 w-[316px] overflow-hidden" onPointerDown={(e) => e.stopPropagation()}>
          {inspector}
        </div>
      )}
      {!isDesktop && (
        <MobileSheet doc={doc} pickedGuestId={pickedGuestId} onPick={onPick} onEdit={editGuest} onAdd={() => openDialog('addGuests')} onGroups={actions.openGroups} onAutoSeat={autoSeat} query={query} setQuery={setQuery}>
          {selectedTable && !pickedGuest ? inspector : null}
        </MobileSheet>
      )}
    </div>
  );

  const editingGuest = dialog?.type === 'editGuest' ? guestById.get(dialog.payload) : null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopBar doc={doc} view={view} setView={setView} compact={!isDesktop} store={store} actions={actions} />

      <main className="relative min-h-0 flex-1">
        {view === 'plan' &&
          (isDesktop ? (
            <div className="grid h-full grid-cols-[316px_minmax(0,1fr)]">
              <GuestPanel
                doc={doc}
                pickedGuestId={pickedGuestId}
                onPick={onPick}
                onEdit={editGuest}
                onGuestPointerDown={beginGuestDrag}
                onAdd={() => openDialog('addGuests')}
                onImport={() => openDialog('import')}
                onGroups={() => openDialog('groups')}
                query={query}
                setQuery={setQuery}
              />
              {plan}
            </div>
          ) : (
            plan
          ))}
        {view === 'guests' && (
          <GuestsView doc={doc} dispatch={dispatch} onEdit={editGuest} onAdd={() => openDialog('addGuests')} onImport={() => openDialog('import')} onGroups={actions.openGroups} onDelete={deleteGuest} onSeatAt={seatAtTable} />
        )}
        {view === 'planning' && (
          <PlanningView
            doc={doc}
            dispatch={dispatch}
            toast={toast}
            section={planningSection}
            setSection={setPlanningSection}
            onRestoreVersion={(v) => openDialog('confirm', { title: `¿Restaurar «${v.name}»?`, body: 'Tu plano actual se sustituye por esta versión. Puedes deshacerlo.', confirmLabel: 'Restaurar', onConfirm: () => replaceDoc(v.doc, `«${v.name}» restaurada`) })}
          />
        )}
        {view === 'summary' && (
          <SummaryView doc={doc} onOpenPlanning={actions.openPlanning} onOpenTable={focusTable} onAutoSeat={autoSeat} onExportPDF={actions.exportPDF} onExportExcel={actions.exportExcel} onEditGuest={editGuest} />
        )}
      </main>

      {!isDesktop && (
        <nav className="relative z-40 flex shrink-0 border-t border-line bg-card pb-[env(safe-area-inset-bottom)]" aria-label="Vistas">
          {VIEWS.map((v) => {
            const Icon = VIEW_ICONS[v.id];
            return (
              <button key={v.id} onClick={() => setView(v.id)} aria-current={view === v.id ? 'page' : undefined} className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${view === v.id ? 'text-ink' : 'text-ink-3'}`}>
                <Icon size={19} strokeWidth={view === v.id ? 2 : 1.6} />
                {v.label}
              </button>
            );
          })}
        </nav>
      )}

      {drag && guestById.get(drag.guestId) && (
        <div ref={ghost} className="pointer-events-none fixed left-0 top-0 z-[100]" style={{ transform: 'translate(-200px, -200px)' }}>
          <div className="flex -rotate-2 items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-3 text-[13px] shadow-lift">
            <Avatar name={guestById.get(drag.guestId).name} color={groupColor.get(guestById.get(drag.guestId).groupId)} size={26} />
            {guestById.get(drag.guestId).name}
          </div>
        </div>
      )}

      <input ref={backupInput} type="file" accept="application/json,.json" className="hidden" onChange={onBackupFile} />

      <AddGuestsDialog open={dialog?.type === 'addGuests'} onClose={closeDialog} doc={doc} onSubmit={addGuests} onCreateGroup={createGroup} />
      <ImportDialog open={dialog?.type === 'import'} onClose={closeDialog} doc={doc} onSubmit={importGuests} />
      <GroupsDialog open={dialog?.type === 'groups'} onClose={closeDialog} doc={doc} dispatch={dispatch} />
      <TemplatesDialog open={dialog?.type === 'templates'} onClose={closeDialog} hasTables={doc.tables.length > 0} onApply={applyTemplate} />
      {dialog?.type === 'event' && <EventDialog open onClose={closeDialog} event={doc.event} onSave={(patch) => dispatch({ type: 'event/update', patch, label: 'Editar evento' })} />}
      {editingGuest && (
        <EditGuestDialog
          key={editingGuest.id}
          guest={editingGuest}
          doc={doc}
          onClose={closeDialog}
          onSave={(patch, avoid) => saveGuest(editingGuest, patch, avoid)}
          onDelete={deleteGuest}
          onUnseat={unseat}
          onCreateGroup={createGroup}
        />
      )}
      {dialog?.type === 'confirm' && <ConfirmDialog open {...dialog.payload} onClose={closeDialog} />}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <Planner />
      </ToastProvider>
    </StoreProvider>
  );
}
