import React, { useState, useEffect, useRef } from 'react';
import { Search, Users, Plus, Trash2, UserPlus, Edit3, FileUp  } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const WeddingSeatingApp = () => {
  const [tables, setTables] = useState([]);
  const [guests, setGuests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedGuest, setDraggedGuest] = useState(null);
  const [showAddTable, setShowAddTable] = useState(false);
  const [showAddGuests, setShowAddGuests] = useState(false);
  const [showImportGuests, setShowImportGuests] = useState(false);
  const [newGuestNames, setNewGuestNames] = useState('');
  const [newTableData, setNewTableData] = useState({ name: '', type: 'round', capacity: 10 });
  const canvasRef = useRef(null);
  const [editingTable, setEditingTable] = useState(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [tableSummary, setTableSummary] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importStatus, setImportStatus] = useState('');

  // 🔹 Cargar datos guardados
  useEffect(() => {
    const loadSavedData = () => {
      try {
        const savedTables = localStorage.getItem('wedding-tables');
        const savedGuests = localStorage.getItem('wedding-guests');
        
        if (savedTables) {
          const parsedTables = JSON.parse(savedTables);
          setTables(parsedTables);
          console.log('Mesas cargadas:', parsedTables.length);
        }
        
        if (savedGuests) {
          const parsedGuests = JSON.parse(savedGuests);
          setGuests(parsedGuests);
          console.log('Invitados cargados:', parsedGuests.length);
        }
      } catch (err) {
        console.error("Error cargando localStorage:", err);
        // Opcional: resetear a valores por defecto
        setTables([]);
        setGuests([]);
      }
    };

    loadSavedData();
  }, []);

  // 🔹 Guardar automáticamente cuando cambian los datos
  useEffect(() => {
    // Solo guardar si hay datos
    if (tables.length > 0 || guests.length > 0) {
      try {
        localStorage.setItem('wedding-tables', JSON.stringify(tables));
        localStorage.setItem('wedding-guests', JSON.stringify(guests));
        console.log('Datos guardados automáticamente');
      } catch (err) {
        console.error("Error guardando en localStorage:", err);
      }
    }
  }, [tables, guests]); // Se ejecuta cuando cambian tables o guests

  // 🔹 Guardar manualmente
  const saveProgress = () => {
    try {
      localStorage.setItem('wedding-tables', JSON.stringify(tables));
      localStorage.setItem('wedding-guests', JSON.stringify(guests));
      
      // Verificar que se guardó correctamente
      const savedTables = localStorage.getItem('wedding-tables');
      const savedGuests = localStorage.getItem('wedding-guests');
      
      if (savedTables && savedGuests) {
        alert('Progreso guardado correctamente 🥂');
      } else {
        alert('Error al guardar el progreso');
      }
    } catch (err) {
      console.error("Error guardando:", err);
      alert('Error al guardar el progreso');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImportFile(file);
      setImportStatus(`Archivo seleccionado: ${file.name}`);
    }
  };

  // 🔹 Procesar archivo Excel/CSV
  const processImportFile = () => {
    if (!importFile) {
      setImportStatus('Por favor, selecciona un archivo');
      return;
    }

    setImportStatus('Procesando archivo...');

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Obtener la primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Extraer nombres (asumiendo que están en la primera columna)
        const names = jsonData
          .flat() // Aplanar el array
          .filter(name => name && typeof name === 'string' && name.trim() !== '') // Filtrar valores válidos
          .map(name => name.trim()); // Limpiar espacios

        if (names.length === 0) {
          setImportStatus('No se encontraron nombres en el archivo');
          return;
        }

        // Crear nuevos invitados
        const newGuests = names.map(name => ({
          id: Date.now() + Math.random(),
          name: name,
          tableId: null,
          seatIndex: null
        }));

        // Añadir a los invitados existentes
        setGuests(prev => [...prev, ...newGuests]);
        setImportStatus(`✅ ${newGuests.length} invitados importados correctamente`);
        setImportFile(null);
        
        // Cerrar modal después de 2 segundos
        setTimeout(() => {
          setShowImportGuests(false);
          setImportStatus('');
        }, 2000);

      } catch (error) {
        console.error('Error procesando archivo:', error);
        setImportStatus('Error al procesar el archivo. Asegúrate de que es un Excel o CSV válido.');
      }
    };

    reader.onerror = () => {
      setImportStatus('Error al leer el archivo');
    };

    reader.readAsArrayBuffer(importFile);
  };

  // 🔹 Función alternativa para CSV simple (sin librería externa)
  const processCSVFile = () => {
    if (!importFile) {
      setImportStatus('Por favor, selecciona un archivo');
      return;
    }

    setImportStatus('Procesando archivo CSV...');

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csvText = e.target.result;
        
        // Procesar CSV simple (una columna con nombres)
        const names = csvText
          .split('\n') // Dividir por líneas
          .map(line => line.trim()) // Limpiar espacios
          .filter(line => line !== '') // Eliminar líneas vacías
          .map(line => {
            // Si hay comas, tomar solo la primera columna
            const columns = line.split(',');
            return columns[0].trim().replace(/^"|"$/g, ''); // Remover comillas si las hay
          })
          .filter(name => name !== ''); // Filtrar nombres vacíos

        if (names.length === 0) {
          setImportStatus('No se encontraron nombres en el archivo CSV');
          return;
        }

        // Crear nuevos invitados
        const newGuests = names.map(name => ({
          id: Date.now() + Math.random(),
          name: name,
          tableId: null,
          seatIndex: null
        }));

        setGuests(prev => [...prev, ...newGuests]);
        setImportStatus(`✅ ${newGuests.length} invitados importados desde CSV`);
        setImportFile(null);
        
        setTimeout(() => {
          setShowImportGuests(false);
          setImportStatus('');
        }, 2000);

      } catch (error) {
        console.error('Error procesando CSV:', error);
        setImportStatus('Error al procesar el archivo CSV');
      }
    };

    reader.readAsText(importFile);
  };

  // 🔹 Función inteligente que detecta el tipo de archivo
  const handleImport = () => {
    if (!importFile) {
      setImportStatus('Por favor, selecciona un archivo');
      return;
    }

    const fileName = importFile.name.toLowerCase();
    
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      processImportFile(); // Procesar Excel
    } else if (fileName.endsWith('.csv')) {
      processCSVFile(); // Procesar CSV
    } else {
      setImportStatus('Formato no soportado. Usa .xlsx, .xls o .csv');
    }
  };

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

    try {
      // Crear PDF principal con el diseño visual
      const canvasElement = canvasRef.current;
      const canvasImage = await html2canvas(canvasElement, { 
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FDF6F0'
      });

      const imgData = canvasImage.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvasElement.scrollWidth, canvasElement.scrollHeight]
      });

      // Página 1: Diseño visual
      pdf.addImage(imgData, 'PNG', 0, 0, canvasElement.scrollWidth, canvasElement.scrollHeight);
      
      // Página 2: Resumen detallado por mesa
      pdf.addPage();
      
      // Título del resumen
      pdf.setFontSize(20);
      pdf.setTextColor(60, 42, 33); // Color #3C2A21
      pdf.text('Resumen de Asignación de Mesas', 20, 30);
      
      let yPosition = 60;
      
      // Información de cada mesa
      tables.forEach((table, index) => {
        const assignedGuests = guests.filter(g => g.tableId === table.id);
        
        // Si no hay espacio para otra mesa, crear nueva página
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 30;
        }
        
        // Encabezado de mesa
        pdf.setFontSize(16);
        pdf.setTextColor(92, 64, 51); // Color #5C4033
        pdf.text(`${table.name} (${assignedGuests.length}/${table.capacity} invitados)`, 20, yPosition);
        
        yPosition += 10;
        
        // Lista de invitados
        pdf.setFontSize(10);
        pdf.setTextColor(60, 42, 33); // Color #3C2A21
        
        if (assignedGuests.length === 0) {
          pdf.text('  - Sin invitados asignados', 25, yPosition);
          yPosition += 15;
        } else {
          assignedGuests.forEach(guest => {
            const seatInfo = guest.seatIndex !== null ? ` - Asiento ${guest.seatIndex + 1}` : '';
            pdf.text(`  • ${guest.name}${seatInfo}`, 25, yPosition);
            yPosition += 8;
            
            // Si se acaba el espacio en la página
            if (yPosition > 270) {
              pdf.addPage();
              yPosition = 30;
            }
          });
        }
        
        yPosition += 10; // Espacio entre mesas
      });
      
      // Página 3: Resumen general
      pdf.addPage();
      pdf.setFontSize(20);
      pdf.setTextColor(60, 42, 33);
      pdf.text('Resumen General de la Boda', 20, 30);
      
      pdf.setFontSize(12);
      let summaryY = 60;
      
      const totalGuests = guests.length;
      const assignedGuests = guests.filter(g => g.tableId !== null).length;
      const unassignedGuests = guests.filter(g => g.tableId === null).length;
      
      pdf.text(`Total de invitados: ${totalGuests}`, 20, summaryY);
      summaryY += 15;
      pdf.text(`Invitados asignados: ${assignedGuests}`, 20, summaryY);
      summaryY += 15;
      pdf.text(`Invitados sin asignar: ${unassignedGuests}`, 20, summaryY);
      summaryY += 15;
      pdf.text(`Total de mesas: ${tables.length}`, 20, summaryY);
      summaryY += 25;
      
      // Mesas con capacidad
      pdf.setFontSize(14);
      pdf.text('Capacidad por Mesa:', 20, summaryY);
      summaryY += 10;
      
      pdf.setFontSize(10);
      tables.forEach(table => {
        const assignedCount = guests.filter(g => g.tableId === table.id).length;
        pdf.text(`  ${table.name}: ${assignedCount}/${table.capacity} (${((assignedCount/table.capacity)*100).toFixed(0)}% llena)`, 25, summaryY);
        summaryY += 8;
      });

      pdf.save('planificacion-boda-completa.pdf');
      
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Error al exportar el PDF. Por favor, intenta nuevamente.');
    }
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

  // 🔹 Función para resetear todo (opcional, para testing)
  const resetAllData = () => {
    if (confirm('¿Estás seguro de que quieres eliminar todos los datos?')) {
      localStorage.removeItem('wedding-tables');
      localStorage.removeItem('wedding-guests');
      setTables([]);
      setGuests([]);
      alert('Datos reseteados correctamente');
    }
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

    // Obtener invitados asignados a esta mesa
    const assignedGuests = guests.filter(g => g.tableId === table.id);
    
    // Calcular tamaño dinámico basado en la cantidad de invitados
    const getTableSize = () => {
      const baseSize = 140; // Tamaño base
      const guestCount = assignedGuests.length;
      
      if (guestCount <= 4) return baseSize;
      if (guestCount <= 6) return baseSize + 20;
      if (guestCount <= 8) return baseSize + 40;
      return baseSize + 60; // Para más de 8 invitados
    };

    const tableSize = getTableSize();
    const radius = tableSize / 2;
    const rectWidth = tableSize + 40;
    const rectHeight = tableSize;

    // Calcular tamaño de fuente dinámico
    const getFontSize = () => {
      const guestCount = assignedGuests.length;
      if (guestCount <= 4) return 'text-xs';
      if (guestCount <= 6) return 'text-[11px]';
      if (guestCount <= 8) return 'text-[10px]';
      return 'text-[9px]';
    };

    const fontSize = getFontSize();

    return (
      <div
        className="absolute select-none transition-all duration-300 cursor-move"
        style={{ left: table.x, top: table.y }}
        onMouseDown={(e) => handleMouseDownTable(e, table.id)}
        onContextMenu={handleContextMenu}
      >
        {/* Contenedor mesa */}
        <div
          className={`relative ${isRound ? 'rounded-full' : 'rounded-xl'}
                      bg-[#FFF8F3] shadow-lg border-2 border-amber-300
                      hover:scale-105 transition-all duration-300 cursor-pointer
                      flex items-center justify-center`}
          style={{
            width: isRound ? tableSize : rectWidth,
            height: isRound ? tableSize : rectHeight,
            minHeight: isRound ? tableSize : rectHeight,
          }}
        >
          {/* Área central para nombres de invitados - SIEMPRE muestra todos */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-2 pointer-events-none overflow-hidden">
            {assignedGuests.length === 0 ? (
              // Mostrar nombre de mesa si no hay invitados
              <div className="font-playfair text-lg text-[#3C2A21] font-semibold text-center">
                {table.name}
              </div>
            ) : (
              // SIEMPRE mostrar todos los nombres completos
              <div className="w-full h-full flex flex-col items-center justify-center space-y-1 p-1">
                {assignedGuests.map(guest => (
                  <div 
                    key={guest.id}
                    className={`${fontSize} text-[#3C2A21] font-medium text-center leading-tight w-full px-1 truncate`}
                    title={guest.name}
                    style={{
                      lineHeight: '1.1',
                      margin: '1px 0'
                    }}
                  >
                    {guest.name}
                  </div>
                ))}
              </div>
            )}
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
                    setTableSummary(table);
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
              seatX = radius + Math.cos(angle) * (radius + 30) - 20;
              seatY = radius + Math.sin(angle) * (radius + 30) - 20;
            } else {
              const perSide = Math.ceil(table.capacity / 2);
              const seatSpacing = rectWidth / Math.max(perSide - 1, 1);
              
              if (index < perSide) {
                seatX = (index * seatSpacing) - 20;
                seatY = -35;
              } else {
                seatX = ((index - perSide) * seatSpacing) - 20;
                seatY = rectHeight + 15;
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
                data-seat-index={index}
              >
                {/* Iniciales */}
                {guest ? guest.name.split(' ').map(n => n[0]).join('').slice(0, 2) : index + 1}

                {/* Botón para eliminar invitado */}
                {guest && (
                  <button
                    className="absolute -top-2 -right-2 w-4 h-4 text-[10px] bg-white text-black rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white z-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      assignGuestToSeat(guest.id, null, null);
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
              onClick={() => setShowImportGuests(true)}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-xl shadow-md flex items-center gap-2 transition-all"
            >
              <FileUp size={20} />
              Importar Excel/CSV
            </button>
          <button
            onClick={exportPDF}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl shadow-md flex items-center gap-2"
          >
            Exportar PDF
          </button>
          <button
            onClick={saveProgress}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl shadow-md flex items-center gap-2"
          >
            💾 Guardar Progreso
          </button>
          <button
            onClick={resetAllData}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl shadow-md flex items-center gap-2"
          >
            <Trash2 size={20} />
            Resetear Todo
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
      {/* Modal importar invitados desde Excel/CSV */}
        {showImportGuests && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 shadow-xl w-96">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileUp size={20} />
                Importar Invitados
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  Selecciona un archivo Excel (.xlsx, .xls) o CSV con una columna de nombres.
                </p>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-input"
                  />
                  <label
                    htmlFor="file-input"
                    className="cursor-pointer block"
                  >
                    <FileUp className="mx-auto mb-2 text-gray-400" size={32} />
                    <span className="text-sm text-gray-600">
                      {importFile ? importFile.name : 'Haz clic para seleccionar archivo'}
                    </span>
                    <br />
                    <span className="text-xs text-gray-500">
                      Formatos soportados: .xlsx, .xls, .csv
                    </span>
                  </label>
                </div>
              </div>

              {importStatus && (
                <div className={`p-3 rounded-lg mb-4 text-sm ${
                  importStatus.includes('✅') 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : importStatus.includes('Error') || importStatus.includes('No se encontraron')
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}>
                  {importStatus}
                </div>
              )}

              <div className="flex justify-between gap-3">
                <button 
                  onClick={() => {
                    setShowImportGuests(false);
                    setImportFile(null);
                    setImportStatus('');
                  }}
                  className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 flex-1"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleImport}
                  disabled={!importFile}
                  className={`px-4 py-2 rounded text-white flex-1 ${
                    importFile 
                      ? 'bg-purple-500 hover:bg-purple-600' 
                      : 'bg-purple-300 cursor-not-allowed'
                  }`}
                >
                  Importar
                </button>
              </div>

              {/* Información de formato */}
              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <h4 className="font-semibold text-sm mb-2 text-amber-800">Formato esperado:</h4>
                <p className="text-xs text-amber-700">
                  • <strong>Excel/CSV</strong> con una columna de nombres<br/>
                  • <strong>Ejemplo:</strong> Columna A: "Ana García", "Carlos López", etc.<br/>
                  • Se ignorarán las demás columnas
                </p>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default WeddingSeatingApp;
