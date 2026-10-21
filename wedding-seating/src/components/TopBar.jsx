import { ArchiveRestore, Download, Eraser, FileDown, FileSpreadsheet, FileText, LayoutTemplate, MoreHorizontal, Plus, Redo2, RotateCcw, Sparkles, Undo2, Wand2 } from 'lucide-react';
import { Menu, MenuItem, MenuSeparator } from './ui';
import { formatDate, monogram } from '../lib/text';
import { VIEWS } from '../lib/views';


function SaveIndicator({ state }) {
  const map = { saved: ['Guardado', 'bg-ok'], saving: ['Guardando…', 'bg-gold'], error: ['No se pudo guardar', 'bg-danger'] };
  const [text, dot] = map[state];
  return (
    <span className="hidden items-center gap-1.5 text-[12px] text-ink-3 xl:flex" role="status">
      <i className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {text}
    </span>
  );
}

export default function TopBar({ doc, view, setView, compact, store, actions }) {
  const { canUndo, canRedo, undo, redo, undoLabel, saveState } = store;
  const sub = [formatDate(doc.event.date), doc.event.venue].filter(Boolean).join(' · ');
  const seated = doc.guests.filter((g) => g.tableId != null).length;

  const moreMenu = (
    <Menu
      width={272}
      trigger={({ toggle, open }) => (
        <button className="icon-btn" onClick={toggle} aria-expanded={open} aria-label="Más opciones">
          <MoreHorizontal size={17} />
        </button>
      )}
    >
      {compact && (
        <>
          <MenuItem icon={<FileDown size={16} />} onClick={actions.exportPDF} hint="Plano, mesas y lista alfabética">
            Descargar PDF
          </MenuItem>
          <MenuItem icon={<FileSpreadsheet size={16} />} onClick={actions.exportExcel}>
            Descargar Excel
          </MenuItem>
          <MenuSeparator />
        </>
      )}
      <MenuItem icon={<Wand2 size={16} />} onClick={actions.autoSeat} hint="Respeta a quien ya está sentado">
        Sentar automáticamente
      </MenuItem>
      <MenuItem icon={<LayoutTemplate size={16} />} onClick={actions.openTemplates}>
        Distribuciones de mesas
      </MenuItem>
      <MenuItem icon={<Eraser size={16} />} onClick={actions.clearAllSeats}>
        Levantar a todos de sus sitios
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={<Download size={16} />} onClick={actions.exportBackup} hint="Archivo .json con todo el plano">
        Guardar copia de seguridad
      </MenuItem>
      <MenuItem icon={<ArchiveRestore size={16} />} onClick={actions.importBackup}>
        Restaurar copia de seguridad
      </MenuItem>
      <MenuItem icon={<Sparkles size={16} />} onClick={actions.loadDemo}>
        Cargar boda de ejemplo
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={<RotateCcw size={16} />} onClick={actions.resetAll} danger>
        Empezar de cero
      </MenuItem>
    </Menu>
  );

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-card px-3 sm:px-5 lg:gap-5">
      <button className="flex min-w-0 items-center gap-3 rounded-xl py-1 pr-2 text-left hover:bg-paper" onClick={actions.editEvent} title="Editar datos del evento">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold font-serif text-[15px] italic text-gold sm:h-10 sm:w-10 sm:text-[16px]">
          {monogram(doc.event.title)}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-serif text-[20px] font-medium leading-tight sm:text-[22px]">{doc.event.title}</span>
          <span className="block truncate text-[11.5px] text-ink-3">
            {compact ? `${seated} / ${doc.guests.length} sentados` : sub || 'Añade la fecha y el lugar'}
          </span>
        </span>
      </button>

      {!compact && (
        <nav className="flex rounded-full border border-line bg-paper p-[3px]" aria-label="Vistas">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              aria-current={view === v.id ? 'page' : undefined}
              className={`rounded-full px-4 py-[7px] text-[13px] font-medium transition-colors ${view === v.id ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}
            >
              {v.label}
            </button>
          ))}
        </nav>
      )}

      <div className="flex-1" />
      <SaveIndicator state={saveState} />
      <div className="flex items-center gap-1.5">
        <button className="icon-btn" onClick={undo} disabled={!canUndo} aria-label="Deshacer" title={undoLabel ? `Deshacer: ${undoLabel} (⌘Z)` : 'Deshacer (⌘Z)'}>
          <Undo2 size={16} />
        </button>
        {!compact && (
          <button className="icon-btn" onClick={redo} disabled={!canRedo} aria-label="Rehacer" title="Rehacer (⇧⌘Z)">
            <Redo2 size={16} />
          </button>
        )}
      </div>
      {!compact && (
        <Menu
          width={268}
          trigger={({ toggle, open }) => (
            <button className="btn" onClick={toggle} aria-expanded={open}>
              <Download size={15} /> Exportar
            </button>
          )}
        >
          <MenuItem icon={<FileText size={16} />} onClick={actions.exportPDF} hint="Plano, mesas y lista alfabética">
            PDF para imprimir
          </MenuItem>
          <MenuItem icon={<FileSpreadsheet size={16} />} onClick={actions.exportExcel} hint="Invitados y mesas">
            Excel
          </MenuItem>
        </Menu>
      )}
      {moreMenu}
      <button className="btn btn-primary px-3 sm:px-3.5" onClick={actions.addTable} title="Nueva mesa (N)">
        <Plus size={16} />
        <span className="hidden sm:inline">Mesa</span>
      </button>
    </header>
  );
}
