import React, { useState, useEffect, useRef } from 'react';
import { Search, Users, Plus, Trash2, UserPlus, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const WeddingSeatingApp = () => {
  const [tables, setTables] = useState([]);
  const [guests, setGuests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedGuest, setDraggedGuest] = useState(null);
  const [showAddTable, setShowAddTable] = useState(false);
  const [showAddGuests, setShowAddGuests] = useState(false);
  const [newGuestNames, setNewGuestNames] = useState('');
  const [newTableData, setNewTableData] = useState({ name: '', type: 'round', capacity: 10 });
  const canvasRef = useRef(null);
  const [editingTable, setEditingTable] = useState(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [tableSummary, setTableSummary] = useState(null);



  // Cargar y guardar datos desde localStorage
  useEffect(() => {
    const savedTables = localStorage.getItem('wedding-tables');
    const savedGuests = localStorage.getItem('wedding-guests');
    if (savedTables) setTables(JSON.parse(savedTables));
    if (savedGuests) setGuests(JSON.parse(savedGuests));
  }, []);

  useEffect(() => {
    localStorage.setItem('wedding-tables', JSON.stringify(tables));
    localStorage.setItem('wedding-guests', JSON.stringify(guests));
  }, [tables, guests]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => setDragPos({ x: e.clientX, y: e.clientY });

    const handleMouseUp = (e) => {
      if (draggedGuest) {
        // usar las coordenadas del evento directamente
        const x = e.clientX;
        const y = e.clientY;

        const seats = document.querySelectorAll('.seat');
        let assigned = false;

        seats.forEach(seat => {
          const rect = seat.getBoundingClientRect();
          if (
            x >= rect.left &&
            x <= rect.right &&
            y >= rect.top &&
            y <= rect.bottom
          ) {
            const tableId = parseInt(seat.dataset.tableId);
            const seatIndex = parseInt(seat.dataset.seatIndex);
            assignGuestToSeat(draggedGuest.id, tableId, seatIndex);
            assigned = true;
          }
        });

        setDraggedGuest(null);
        setIsDragging(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, draggedGuest]);



  // Añadir mesa
  const addTable = () => {
    const newTable = {
      id: Date.now(),
      name: newTableData.name || `Mesa ${tables.length + 1}`,
      type: newTableData.type,
      capacity: parseInt(newTableData.capacity),
      x: 100 + tables.length * 60,
      y: 100,
      seats: Array(parseInt(newTableData.capacity)).fill(null)
    };
    setTables([...tables, newTable]);
    setShowAddTable(false);
    setNewTableData({ name: '', type: 'round', capacity: 10 });
  };

  const handleMouseDownTable = (e, tableId) => {
    e.preventDefault();
    const table = tables.find(t => t.id === tableId);
    const offsetX = e.clientX - table.x;
    const offsetY = e.clientY - table.y;

    const handleMouseMove = (ev) => {
      const newX = ev.clientX - offsetX + canvasRef.current.scrollLeft;
      const newY = ev.clientY - offsetY + canvasRef.current.scrollTop;
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, x: newX, y: newY } : t));
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const exportPDF = async () => {
    if (!canvasRef.current) return;

    // Captura el canvas como imagen
    const canvasElement = canvasRef.current;
    const canvasImage = await html2canvas(canvasElement, { scale: 2 });

    const imgData = canvasImage.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvasElement.scrollWidth, canvasElement.scrollHeight]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvasElement.scrollWidth, canvasElement.scrollHeight);
    pdf.save('wedding-seating.pdf');
  };


  const saveEditedTable = () => {
    if (!editingTable) return;

    const updatedTables = tables.map(t => {
      if (t.id === editingTable.id) {
        let seats = t.seats;
        const newCapacity = parseInt(editingTable.capacity);
        if (newCapacity > t.capacity) {
          // agregar asientos vacíos si la capacidad aumenta
          seats = [...seats, ...Array(newCapacity - t.capacity).fill(null)];
        } else if (newCapacity < t.capacity) {
          // eliminar asientos extra y desasignar invitados
          const seatsToRemove = seats.slice(newCapacity);
          const updatedGuests = guests.map(g => {
            if (g.tableId === t.id && g.seatIndex >= newCapacity) {
              return { ...g, tableId: null, seatIndex: null };
            }
            return g;
          });
          setGuests(updatedGuests);
          seats = seats.slice(0, newCapacity);
        }

        return {
          ...t,
          name: editingTable.name,
          type: editingTable.type,
          capacity: newCapacity,
          seats,
        };
      }
      return t;
    });

    setTables(updatedTables);
    setEditingTable(null);
  };

  // Añadir invitados
  const addGuests = () => {
    const names = newGuestNames.split('\n').filter(n => n.trim());
    const newGuests = names.map(name => ({
      id: Date.now() + Math.random(),
      name: name.trim(),
      tableId: null,
      seatIndex: null
    }));
    setGuests([...guests, ...newGuests]);
    setNewGuestNames('');
    setShowAddGuests(false);
  };

  // Eliminar mesa
  const deleteTable = (tableId) => {
    const freedGuests = guests.map(g =>
      g.tableId === tableId ? { ...g, tableId: null, seatIndex: null } : g
    );
    setGuests(freedGuests);
    setTables(tables.filter(t => t.id !== tableId));
  };

  // Asignar invitado a asiento
  // Reemplaza la función assignGuestToSeat por esta versión:
  const assignGuestToSeat = (guestId, tableId, seatIndex) => {
    setGuests(prevGuests => {
      // quitar a cualquier invitado que ya esté en ese asiento
      const updated = prevGuests.map(g => {
        if (g.id === guestId) return { ...g, tableId, seatIndex };
        if (g.tableId === tableId && g.seatIndex === seatIndex) return { ...g, tableId: null, seatIndex: null };
        return g;
      });
      return updated;
    });
  };



  const handleDragStart = (e, guest) => setDraggedGuest(guest);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e, tableId, seatIndex) => {
    e.preventDefault();
    if (draggedGuest) assignGuestToSeat(draggedGuest.id, tableId, seatIndex);
  };

  const unassignedGuests = guests.filter(g => g.tableId === null);
  const assignedGuests = guests.filter(g => g.tableId !== null);
  const filteredGuests = unassignedGuests.filter(g =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const TableComponent = ({ table }) => {
    const isRound = table.type === 'round';
    const radius = 70;
    const rectWidth = 150;
    const rectHeight = 80;
    const [menuVisible, setMenuVisible] = React.useState(false);
    const [menuPos, setMenuPos] = React.useState({ x: 0, y: 0 });

    const handleContextMenu = (e) => {
      e.preventDefault();
      setMenuVisible(true);
      setMenuPos({ x: e.clientX, y: e.clientY });
    };

    const handleClickOutside = () => setMenuVisible(false);

    React.useEffect(() => {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
      <div
        className="absolute select-none transition-transform duration-200 cursor-move"
        style={{ left: table.x, top: table.y }}
        onMouseDown={(e) => handleMouseDownTable(e, table.id)} // <-- aquí usamos tu arrastre manual
        onContextMenu={handleContextMenu}>

        {/* Contenedor mesa */}
        <div
          className={`relative ${isRound ? 'rounded-full' : 'rounded-xl'}
                      bg-[#FFF8F3] shadow-lg border border-amber-300
                      hover:scale-105 transition-transform duration-300 cursor-pointer`}
          style={{
            width: isRound ? radius * 2 : rectWidth,
            height: isRound ? radius * 2 : rectHeight,
          }}
        >
          {/* Nombre de la mesa */}
          <div className="absolute inset-0 flex items-center justify-center font-playfair text-lg text-[#3C2A21] font-semibold pointer-events-none">
            {table.name}
          </div>

          {/* Menú contextual */}
          <AnimatePresence>
            {menuVisible && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="absolute z-50 bg-white border rounded-lg shadow-lg flex flex-col"
                style={{ top: menuPos.y - table.y, left: menuPos.x - table.x }}
              >
                <button
                  className="px-4 py-2 hover:bg-blue-500 hover:text-white rounded-t"
                  onClick={() => {
                    setMenuVisible(false);
                    setEditingTable(table);
                  }}
                >
                  Editar
                </button>
                <button
                  className="px-4 py-2 hover:bg-gray-500 hover:text-white"
                  onClick={() => {
                    setMenuVisible(false);
                    setTableSummary(table); // Abrir resumen
                  }}
                >
                  Ver Resumen
                </button>
                <button
                  className="px-4 py-2 hover:bg-red-500 hover:text-white rounded-b"
                  onClick={() => {
                    setMenuVisible(false);
                    if (confirm(`¿Eliminar ${table.name}?`)) deleteTable(table.id);
                  }}
                >
                  Eliminar
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Aquí van los asientos */}
          {table.seats.map((seat, index) => {
            const angle = (index / table.capacity) * 2 * Math.PI - Math.PI / 2;
            const guest = guests.find(g => g.tableId === table.id && g.seatIndex === index);
            let seatX, seatY;

            if (isRound) {
              seatX = radius + Math.cos(angle) * (radius + 25) - 20;
              seatY = radius + Math.sin(angle) * (radius + 25) - 20;
            } else {
              const perSide = Math.ceil(table.capacity / 2);
              if (index < perSide) {
                seatX = (index / (perSide - 1)) * rectWidth - 20;
                seatY = -30;
              } else {
                seatX = ((index - perSide) / (table.capacity - perSide - 1)) * rectWidth - 20;
                seatY = rectHeight + 10;
              }
            }

            return (
              <div
                key={index}
                onDragOver={handleDragOver}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!draggedGuest) return;
                  assignGuestToSeat(draggedGuest.id, table.id, index);
                }}
                draggable={!!guest}
                onDragStart={(e) => guest && handleDragStart(e, guest)}
                className={`seat absolute w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs cursor-pointer transition-all duration-200 group
                  ${guest
                    ? 'bg-rose-400 text-white border-rose-500 hover:bg-rose-500'
                    : 'bg-white border-gray-400 hover:border-rose-400'
                  }`}
                style={{ left: seatX, top: seatY }}
                data-table-id={table.id}
                data-seat-index={index} // <<--- esto es importante
              >
                {/* Iniciales */}
                {guest ? guest.name.split(' ').map(n => n[0]).join('').slice(0, 2) : index + 1}

                {/* Botón para eliminar invitado */}
                {guest && (
                  <button
                    className="absolute -top-2 -right-2 w-4 h-4 text-[10px] bg-white text-black rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white z-50"
                    onClick={(e) => {
                      e.stopPropagation(); // evitar arrastrar mesa
                      assignGuestToSeat(guest.id, null, null); // desasignar
                    }}
                  >
                    ×
                  </button>
                )}

                {/* Tooltip */}
                {guest && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                    {guest.name}
                  </span>
                )}
              </div>

            );
          })}
        </div>
      </div>
    );
  };



  return (
    <div className="flex h-screen bg-gradient-to-br from-[#FDF6F0] to-[#FAE1DD] text-[#3C2A21] font-inter">
      {/* Zona principal */}
      <div className="flex-1 relative overflow-auto">
        <div className="absolute top-4 left-4 z-10 flex gap-3 animate-fadeIn">
          <button
            onClick={() => setShowAddTable(true)}
            className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl shadow-md flex items-center gap-2 transition-all"
          >
            <Plus size={20} />
            Nueva Mesa
          </button>
          <button
            onClick={() => setShowAddGuests(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl shadow-md flex items-center gap-2 transition-all"
          >
            <UserPlus size={20} />
            Añadir Invitados
          </button>
          <button
            onClick={exportPDF}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl shadow-md flex items-center gap-2"
          >
            Exportar PDF
          </button>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="relative p-12"
          style={{ minWidth: '2000px', minHeight: '2000px' }}
          onDragOver={handleDragOver}
          onDrop={(e) => {
            const tableId = parseInt(e.dataTransfer.getData('tableId'));
            if (tableId) {
              const offsetX = parseInt(e.dataTransfer.getData('offsetX'));
              const offsetY = parseInt(e.dataTransfer.getData('offsetY'));
              const table = tables.find(t => t.id === tableId);
              if (table) {
                const newX = e.clientX - offsetX + canvasRef.current.scrollLeft;
                const newY = e.clientY - offsetY + canvasRef.current.scrollTop;
                setTables(tables.map(t =>
                  t.id === tableId ? { ...t, x: newX, y: newY } : t
                ));
              }
            }
          }}
        >
          {tables.map(table => (
            <TableComponent key={table.id} table={table} />
          ))}
        </div>
      </div>

      {/* Panel lateral */}
      <div className="w-96 bg-[#3C2A21] text-[#FDF6F0] border-l border-[#E2C275] flex flex-col">
        <div className="p-5 border-b border-[#E2C275] bg-[#4E3629]">
          <h2 className="font-playfair text-lg mb-3 flex items-center gap-2">
            <Users size={20} /> Estadísticas
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Total invitados:</span><span>{guests.length}</span></div>
            <div className="flex justify-between"><span>Asignados:</span><span>{assignedGuests.length}</span></div>
            <div className="flex justify-between"><span>Sin asignar:</span><span>{unassignedGuests.length}</span></div>
            <div className="flex justify-between"><span>Mesas:</span><span>{tables.length}</span></div>
          </div>
        </div>

        <div className="p-4 border-b border-[#E2C275] bg-[#4E3629]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-[#EAD7C3]" size={20} />
            <input
              type="text"
              placeholder="Buscar invitado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#5C4033]/80 text-[#FFF9F4] placeholder-[#EAD7C3]"
            />
          </div>
        </div>

        <div className="space-y-2">
          {unassignedGuests.filter(g =>
              g.name.toLowerCase().includes(searchTerm.toLowerCase())
            ).map(guest => (
              <div
                key={guest.id}
                onMouseDown={(e) => {
                  e.preventDefault(); // evitar conflicto con drag nativo
                  setDraggedGuest(guest);
                  setIsDragging(true);
                  setDragPos({ x: e.clientX, y: e.clientY });
                }}
                className="bg-[#5C4033]/70 p-3 rounded-lg cursor-pointer hover:bg-[#704B3B]/80 transition-all border border-[#E2C275]/30"
                title={guest.name}
              >
                {guest.name}
              </div>
          ))}
        </div>
      </div>

      {/* Modal añadir mesa */}
      {showAddTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl w-80">
            <h3 className="text-lg font-semibold mb-4">Añadir Mesa</h3>
            <input
              type="text"
              placeholder="Nombre de mesa"
              value={newTableData.name}
              onChange={(e) => setNewTableData({ ...newTableData, name: e.target.value })}
              className="w-full border rounded p-2 mb-3"
            />
            <select
              value={newTableData.type}
              onChange={(e) => setNewTableData({ ...newTableData, type: e.target.value })}
              className="w-full border rounded p-2 mb-3"
            >
              <option value="round">Redonda</option>
              <option value="rectangular">Rectangular</option>
            </select>
            <input
              type="number"
              min="1"
              value={newTableData.capacity}
              onChange={(e) => setNewTableData({ ...newTableData, capacity: e.target.value })}
              className="w-full border rounded p-2 mb-3"
            />
            <div className="flex justify-between">
              <button onClick={() => setShowAddTable(false)} className="px-4 py-2 rounded bg-gray-300">Cancelar</button>
              <button onClick={addTable} className="px-4 py-2 rounded bg-rose-500 text-white">Añadir</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar mesa */}
      {editingTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl w-80">
            <h3 className="text-lg font-semibold mb-4">Editar Mesa</h3>
            <input
              type="text"
              placeholder="Nombre de mesa"
              value={editingTable.name}
              onChange={(e) => setEditingTable({ ...editingTable, name: e.target.value })}
              className="w-full border rounded p-2 mb-3"
            />
            <select
              value={editingTable.type}
              onChange={(e) => setEditingTable({ ...editingTable, type: e.target.value })}
              className="w-full border rounded p-2 mb-3"
            >
              <option value="round">Redonda</option>
              <option value="rectangular">Rectangular</option>
            </select>
            <input
              type="number"
              min="1"
              value={editingTable.capacity}
              onChange={(e) => setEditingTable({ ...editingTable, capacity: e.target.value })}
              className="w-full border rounded p-2 mb-3"
            />
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      // borrar invitados asignados
                      const updatedGuests = guests.map(g =>
                        g.tableId === editingTable.id ? { ...g, tableId: null, seatIndex: null } : g
                      );
                      setGuests(updatedGuests);
                    }
                  }}
                />
                Borrar invitados asignados
              </label>
            </div>
            <div className="flex justify-between">
              <button onClick={() => setEditingTable(null)} className="px-4 py-2 rounded bg-gray-300">Cancelar</button>
              <button onClick={saveEditedTable} className="px-4 py-2 rounded bg-blue-500 text-white">Guardar</button>
            </div>
          </div>
        </div>
      )}


      {/* Modal añadir invitados */}
      {showAddGuests && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl w-80">
            <h3 className="text-lg font-semibold mb-4">Añadir Invitados</h3>
            <textarea
              placeholder="Un nombre por línea"
              value={newGuestNames}
              onChange={(e) => setNewGuestNames(e.target.value)}
              className="w-full border rounded p-2 mb-3 h-40"
            />
            <div className="flex justify-between">
              <button onClick={() => setShowAddGuests(false)} className="px-4 py-2 rounded bg-gray-300">Cancelar</button>
              <button onClick={addGuests} className="px-4 py-2 rounded bg-amber-500 text-white">Añadir</button>
            </div>
          </div>
        </div>
      )}

      {isDragging && draggedGuest && (
        <motion.div
          className="w-10 h-10 rounded-full bg-rose-400 text-white flex items-center justify-center shadow-lg z-50 fixed top-0 left-0 pointer-events-none"
          style={{ x: dragPos.x - 20, y: dragPos.y - 20 }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          {draggedGuest.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </motion.div>
      )}
      {tableSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl w-96 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Resumen de {tableSummary.name}</h3>

            <p><strong>Tipo:</strong> {tableSummary.type === 'round' ? 'Redonda' : 'Rectangular'}</p>
            <p><strong>Capacidad:</strong> {tableSummary.capacity}</p>
            <p><strong>Asientos ocupados:</strong> {tableSummary.seats.filter((_, idx) => guests.some(g => g.tableId === tableSummary.id && g.seatIndex === idx)).length}</p>
            <p><strong>Asientos libres:</strong> {tableSummary.capacity - tableSummary.seats.filter((_, idx) => guests.some(g => g.tableId === tableSummary.id && g.seatIndex === idx)).length}</p>

            <h4 className="mt-4 font-semibold">Invitados asignados:</h4>
            <ul className="list-disc list-inside">
              {guests
                .filter(g => g.tableId === tableSummary.id)
                .map(g => (
                  <li key={g.id}>
                    {g.name} {g.seatIndex !== null ? `(Asiento ${g.seatIndex + 1})` : '(Sin asignar asiento)'}
                  </li>
              ))}
            </ul>

            <div className="mt-4 flex justify-end">
              <button
                className="px-4 py-2 rounded bg-gray-300"
                onClick={() => setTableSummary(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeddingSeatingApp;
