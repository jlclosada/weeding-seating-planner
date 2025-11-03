import React, { useState, useEffect, useRef } from 'react';
import { Search, Users, Plus, Trash2, UserPlus, Edit3, FileUp, Heart, Sparkles, Download, Save, RotateCcw, Tag, X, Menu, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import toast, { Toaster } from 'react-hot-toast';

// Grupos predefinidos iniciales
const DEFAULT_GROUPS = [
  { id: 'family', name: 'Familia', color: '#a8b5a1' },
  { id: 'friends', name: 'Amigos', color: '#FACCC0' },
  { id: 'work', name: 'Trabajo', color: '#8b9ca6' },
  { id: 'couple', name: 'Pareja', color: '#c9b8a8' },
  { id: 'other', name: 'Otros', color: '#b8a5b0' }
];

// Colores predefinidos para seleccionar
const AVAILABLE_COLORS = [
  '#a8b5a1', '#7fa99b', '#8b9ca6', '#c9b8a8', '#b8a5b0',
  '#d4c4b0', '#9eb3b6', '#b8a892', '#a5b8ad', '#c4b5a5',
  '#8fa89d', '#b0a699', '#97a8ab', '#baa898', '#a3b5a8'
];

const WeddingSeatingApp = () => {
  const [tables, setTables] = useState([]);
  const [guests, setGuests] = useState([]);
  const [groups, setGroups] = useState(DEFAULT_GROUPS);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedGuest, setDraggedGuest] = useState(null);
  const [showAddTable, setShowAddTable] = useState(false);
  const [showAddGuests, setShowAddGuests] = useState(false);
  const [showImportGuests, setShowImportGuests] = useState(false);
  const [showManageGroups, setShowManageGroups] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [newGuestNames, setNewGuestNames] = useState('');
  const [newGuestGroup, setNewGuestGroup] = useState('other');
  const [newTableData, setNewTableData] = useState({ name: '', type: 'round', capacity: 10 });
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(AVAILABLE_COLORS[0]);
  const canvasRef = useRef(null);
  const [editingTable, setEditingTable] = useState(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [tableSummary, setTableSummary] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importStatus, setImportStatus] = useState('');
  const isInitialMount = useRef(true);
  const dragOverTarget = useRef(null);

  // 🔹 Cargar datos guardados
  useEffect(() => {
    const loadSavedData = () => {
      try {
        const savedTables = localStorage.getItem('wedding-tables');
        const savedGuests = localStorage.getItem('wedding-guests');
        const savedGroups = localStorage.getItem('wedding-groups');

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

        if (savedGroups) {
          const parsedGroups = JSON.parse(savedGroups);
          setGroups(parsedGroups);
          console.log('Grupos cargados:', parsedGroups.length);
        }
      } catch (err) {
        console.error("Error cargando localStorage:", err);
        // Opcional: resetear a valores por defecto
        setTables([]);
        setGuests([]);
        setGroups(DEFAULT_GROUPS);
      }
    };

    loadSavedData();
  }, []);

  // 🔹 Cerrar sidebar automáticamente cuando empieza el drag
  useEffect(() => {
    if (isDragging && draggedGuest) {
      setShowMobileSidebar(false);
    }
  }, [isDragging, draggedGuest]);

  // 🔹 Drag and drop táctil (touch)
  useEffect(() => {
    const handleTouchMove = (e) => {
      if (!isDragging || !draggedGuest) return;

      e.preventDefault(); // Prevenir scroll mientras se arrastra

      const touch = e.touches[0];
      setDragPos({ x: touch.clientX, y: touch.clientY });

      // Detectar elemento debajo del toque
      const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);

      // Buscar el asiento más cercano
      const seatElement = elementBelow?.closest('.seat');
      if (seatElement && seatElement !== dragOverTarget.current) {
        // Resetear estilos del target anterior
        if (dragOverTarget.current) {
          dragOverTarget.current.style.transform = '';
          dragOverTarget.current.style.boxShadow = '';
        }

        // Aplicar efecto visual al nuevo target
        dragOverTarget.current = seatElement;
        seatElement.style.transform = 'scale(1.15)';
        seatElement.style.boxShadow = '0 8px 20px rgba(0,0,0,0.2)';
      } else if (!seatElement && dragOverTarget.current) {
        // Resetear cuando no hay target
        dragOverTarget.current.style.transform = '';
        dragOverTarget.current.style.boxShadow = '';
        dragOverTarget.current = null;
      }
    };

    const handleTouchEnd = (e) => {
      if (!isDragging || !draggedGuest) return;

      const touch = e.changedTouches[0];
      const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);

      // Buscar el asiento donde se soltó
      const seatElement = elementBelow?.closest('.seat');

      if (seatElement) {
        const tableId = parseInt(seatElement.dataset.tableId);
        const seatIndex = parseInt(seatElement.dataset.seatIndex);

        if (!isNaN(tableId) && !isNaN(seatIndex)) {
          assignGuestToSeat(draggedGuest.id, tableId, seatIndex);
        }

        // Resetear estilos
        seatElement.style.transform = '';
        seatElement.style.boxShadow = '';
      }

      // Resetear estado
      setIsDragging(false);
      setDraggedGuest(null);
      dragOverTarget.current = null;
    };

    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: false });
    }

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, draggedGuest]);

  // 🔹 Guardar automáticamente cuando cambian los datos
  useEffect(() => {
    // No guardar en el primer renderizado (solo cuando se carga la página)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Guardar en localStorage cada vez que cambian los datos
    try {
      localStorage.setItem('wedding-tables', JSON.stringify(tables));
      localStorage.setItem('wedding-guests', JSON.stringify(guests));
      localStorage.setItem('wedding-groups', JSON.stringify(groups));
      console.log('💾 Guardado automático:', {
        mesas: tables.length,
        invitados: guests.length,
        grupos: groups.length
      });
    } catch (err) {
      console.error("❌ Error guardando en localStorage:", err);
      toast.error('Error al guardar automáticamente');
    }
  }, [tables, guests, groups]); // Se ejecuta cuando cambian tables, guests o groups

  // 🔹 Guardar manualmente
  const saveProgress = () => {
    try {
      localStorage.setItem('wedding-tables', JSON.stringify(tables));
      localStorage.setItem('wedding-guests', JSON.stringify(guests));
      localStorage.setItem('wedding-groups', JSON.stringify(groups));

      // Verificar que se guardó correctamente
      const savedTables = localStorage.getItem('wedding-tables');
      const savedGuests = localStorage.getItem('wedding-guests');
      const savedGroups = localStorage.getItem('wedding-groups');

      console.log('Guardado manual - Datos en localStorage:', {
        mesas: savedTables ? JSON.parse(savedTables).length : 0,
        invitados: savedGuests ? JSON.parse(savedGuests).length : 0,
        grupos: savedGroups ? JSON.parse(savedGroups).length : 0
      });

      if (savedTables && savedGuests && savedGroups) {
        toast.success('Progreso guardado correctamente 🥂', {
          duration: 3000,
          icon: '💾',
          style: {
            borderRadius: '12px',
            background: '#10b981',
            color: '#fff',
          },
        });
      } else {
        toast.error('Error al guardar el progreso');
      }
    } catch (err) {
      console.error("Error guardando:", err);
      toast.error('Error al guardar el progreso');
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
          seatIndex: null,
          group: 'other' // Grupo por defecto
        }));

        // Añadir a los invitados existentes
        setGuests(prev => [...prev, ...newGuests]);
        setImportStatus(`✅ ${newGuests.length} invitados importados correctamente`);
        toast.success(`${newGuests.length} invitados importados correctamente`, {
          icon: '🎉',
          duration: 3000,
        });
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
          seatIndex: null,
          group: 'other' // Grupo por defecto
        }));

        setGuests(prev => [...prev, ...newGuests]);
        setImportStatus(`✅ ${newGuests.length} invitados importados desde CSV`);
        toast.success(`${newGuests.length} invitados importados desde CSV`, {
          icon: '🎉',
          duration: 3000,
        });
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

  // Manejo de drag táctil para mesas
  const handleTouchStartTable = (e, tableId) => {
    const table = tables.find(t => t.id === tableId);
    const touch = e.touches[0];
    const offsetX = touch.clientX - table.x;
    const offsetY = touch.clientY - table.y;

    const handleTouchMove = (ev) => {
      ev.preventDefault();
      const touch = ev.touches[0];
      const newX = touch.clientX - offsetX + canvasRef.current.scrollLeft;
      const newY = touch.clientY - offsetY + canvasRef.current.scrollTop;
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, x: newX, y: newY } : t));
    };

    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  const exportPDF = async () => {
    if (!canvasRef.current) return;

    try {
      toast.loading('Generando PDF...', { id: 'pdf-export' });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Página 1: Resumen detallado por mesa
      // Fondo
      pdf.setFillColor(253, 246, 240);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Header decorativo
      pdf.setFillColor(168, 85, 247);
      pdf.rect(0, 0, pageWidth, 20, 'F');

      // Título del resumen
      pdf.setFontSize(18);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Resumen de Asignación de Mesas', pageWidth / 2, 13, { align: 'center' });

      let yPosition = 30;
      const leftMargin = 15;
      const rightMargin = pageWidth - 15;
      const columnWidth = (pageWidth - 30) / 2;
      let currentColumn = 0;

      // Información de cada mesa con diseño mejorado
      tables.forEach((table, index) => {
        const assignedGuests = guests.filter(g => g.tableId === table.id);
        const tableHeight = 15 + (assignedGuests.length * 6) + 8;

        // Si no hay espacio para otra mesa, crear nueva página o cambiar columna
        if (yPosition + tableHeight > pageHeight - 10) {
          if (currentColumn === 0) {
            currentColumn = 1;
            yPosition = 30;
          } else {
            pdf.addPage();
            pdf.setFillColor(253, 246, 240);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            yPosition = 15;
            currentColumn = 0;
          }
        }

        const xPosition = currentColumn === 0 ? leftMargin : leftMargin + columnWidth + 5;

        // Caja de mesa
        pdf.setFillColor(255, 241, 242);
        pdf.roundedRect(xPosition, yPosition, columnWidth - 5, tableHeight, 3, 3, 'F');

        // Borde
        pdf.setDrawColor(244, 63, 94);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(xPosition, yPosition, columnWidth - 5, tableHeight, 3, 3, 'S');

        // Encabezado de mesa
        pdf.setFontSize(12);
        pdf.setTextColor(168, 181, 161);
        pdf.setFont('helvetica', 'bold');
        pdf.text(table.name, xPosition + 3, yPosition + 6);

        // Capacidad
        pdf.setFontSize(9);
        pdf.setTextColor(107, 114, 128);
        pdf.setFont('helvetica', 'normal');
        pdf.text(assignedGuests.length + '/' + table.capacity + ' asientos', xPosition + 3, yPosition + 11);

        let guestY = yPosition + 17;

        // Lista de invitados
        pdf.setFontSize(9);
        pdf.setTextColor(55, 65, 81);

        if (assignedGuests.length === 0) {
          pdf.setTextColor(156, 163, 175);
          pdf.text('Sin invitados asignados', xPosition + 5, guestY);
        } else {
          assignedGuests.forEach(guest => {
            if (guestY < yPosition + tableHeight - 3) {
              const seatInfo = guest.seatIndex !== null ? ' (' + (guest.seatIndex + 1) + ')' : '';
              pdf.text('- ' + guest.name + seatInfo, xPosition + 5, guestY);
              guestY += 5;
            }
          });
        }

        yPosition += tableHeight + 5;
      });

      // Página 2: Resumen general con diseño premium
      pdf.addPage();

      // Fondo
      pdf.setFillColor(253, 246, 240);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Header decorativo
      pdf.setFillColor(16, 185, 129);
      pdf.rect(0, 0, pageWidth, 20, 'F');

      pdf.setFontSize(18);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Resumen General de la Boda', pageWidth / 2, 13, { align: 'center' });

      let summaryY = 35;

      const totalGuests = guests.length;
      const assignedGuestsCount = guests.filter(g => g.tableId !== null).length;
      const unassignedGuestsCount = guests.filter(g => g.tableId === null).length;

      // Tarjetas de estadísticas (sin iconos problemáticos)
      const stats = [
        { label: 'Total de Invitados', value: totalGuests, color: [168, 181, 161] },
        { label: 'Invitados Asignados', value: assignedGuestsCount, color: [127, 169, 155] },
        { label: 'Sin Asignar', value: unassignedGuestsCount, color: [201, 184, 168] },
        { label: 'Total de Mesas', value: tables.length, color: [139, 156, 166] }
      ];

      const cardWidth = (pageWidth - 40) / 2;
      const cardHeight = 25;
      let cardX = 15;
      let cardY = summaryY;

      stats.forEach((stat, idx) => {
        if (idx % 2 === 0 && idx > 0) {
          cardY += cardHeight + 5;
          cardX = 15;
        }

        // Fondo de tarjeta
        pdf.setFillColor(stat.color[0], stat.color[1], stat.color[2], 0.1);
        pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, 'F');

        // Borde
        pdf.setDrawColor(stat.color[0], stat.color[1], stat.color[2]);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, 'S');

        // Indicador visual en lugar de icono
        pdf.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
        pdf.circle(cardX + 8, cardY + 12, 3, 'F');

        // Label
        pdf.setFontSize(10);
        pdf.setTextColor(107, 114, 128);
        pdf.text(stat.label, cardX + 15, cardY + 10);

        // Value
        pdf.setFontSize(18);
        pdf.setTextColor(stat.color[0], stat.color[1], stat.color[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text(stat.value.toString(), cardX + 15, cardY + 20);
        pdf.setFont('helvetica', 'normal');

        cardX += cardWidth + 10;
      });

      summaryY = cardY + cardHeight + 20;

      // Sección de capacidad por mesa
      pdf.setFontSize(14);
      pdf.setTextColor(55, 65, 81);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Capacidad por Mesa', 15, summaryY);
      summaryY += 10;

      // Tabla de mesas
      tables.forEach((table, idx) => {
        if (summaryY > pageHeight - 15) {
          pdf.addPage();
          pdf.setFillColor(253, 246, 240);
          pdf.rect(0, 0, pageWidth, pageHeight, 'F');
          summaryY = 20;
        }

        const assignedCount = guests.filter(g => g.tableId === table.id).length;
        const percentage = ((assignedCount/table.capacity)*100).toFixed(0);

        // Barra de progreso más compacta
        const barWidth = pageWidth - 120; // Reducido para dar más espacio al texto
        const barHeight = 6; // Más delgada

        pdf.setFontSize(9);
        pdf.setTextColor(55, 65, 81);
        pdf.text(table.name, 15, summaryY);

        // Fondo de barra
        pdf.setFillColor(229, 231, 235);
        pdf.roundedRect(70, summaryY - 4, barWidth, barHeight, 2, 2, 'F');

        // Progreso
        const fillWidth = (barWidth * assignedCount) / table.capacity;
        const color = percentage < 50 ? [201, 184, 168] : percentage < 80 ? [168, 181, 161] : [127, 169, 155];
        pdf.setFillColor(color[0], color[1], color[2]);
        pdf.roundedRect(70, summaryY - 4, fillWidth, barHeight, 2, 2, 'F');

        // Texto con más espacio
        pdf.setFontSize(8);
        pdf.setTextColor(107, 114, 139);
        pdf.text(assignedCount + '/' + table.capacity + ' (' + percentage + '%)', 70 + barWidth + 3, summaryY);

        summaryY += 10; // Espaciado reducido
      });

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(156, 163, 175);
      pdf.text(`Generado el ${new Date().toLocaleDateString('es-ES')} - Planificador de Boda`, pageWidth / 2, pageHeight - 5, { align: 'center' });

      pdf.save('planificacion-boda-completa.pdf');

      toast.success('PDF generado correctamente', { id: 'pdf-export', icon: '🎉' });

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
      seatIndex: null,
      group: newGuestGroup
    }));
    setGuests([...guests, ...newGuests]);
    setNewGuestNames('');
    setNewGuestGroup('other');
    setShowAddGuests(false);
  };

  // Obtener color del grupo
  const getGroupColor = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    return group ? group.color : '#b8a5b0';
  };

  // Añadir nuevo grupo
  const addGroup = () => {
    if (!newGroupName.trim()) {
      toast.error('El nombre del grupo no puede estar vacío');
      return;
    }

    const newGroup = {
      id: Date.now().toString(),
      name: newGroupName.trim(),
      color: newGroupColor
    };

    setGroups([...groups, newGroup]);
    setNewGroupName('');
    setNewGroupColor(AVAILABLE_COLORS[0]);
    toast.success(`Grupo "${newGroup.name}" creado correctamente`, {
      icon: '✨',
    });
  };

  // Eliminar grupo
  const deleteGroup = (groupId) => {
    // No permitir eliminar si hay invitados con ese grupo
    const guestsInGroup = guests.filter(g => g.group === groupId).length;
    if (guestsInGroup > 0) {
      toast.error(`No se puede eliminar: hay ${guestsInGroup} invitado(s) en este grupo`, {
        duration: 4000,
      });
      return;
    }

    setGroups(groups.filter(g => g.id !== groupId));
    toast.success('Grupo eliminado correctamente');
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
      toast.success('Datos reseteados correctamente', {
        icon: '🔄',
        style: {
          borderRadius: '12px',
        },
      });
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
        onTouchStart={(e) => handleTouchStartTable(e, table.id)}
        onContextMenu={handleContextMenu}
      >
        {/* Contenedor mesa */}
        <div
          className={`relative ${isRound ? 'rounded-full' : 'rounded-2xl'}
                      bg-gradient-to-br from-white to-violet-50 shadow-xl border-3 border-violet-300
                      hover:scale-105 hover:shadow-violet-300/40 transition-all duration-300 cursor-pointer
                      flex items-center justify-center table-container
                      backdrop-blur-sm bg-opacity-95`}
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
              <div className="text-lg text-violet-600 font-semibold text-center drop-shadow-sm">
                {table.name}
              </div>
            ) : (
              // SIEMPRE mostrar todos los nombres completos
              <div className="w-full h-full flex flex-col items-center justify-center space-y-1 p-1">
                {assignedGuests.map(guest => (
                  <div
                    key={guest.id}
                    className={`${fontSize} text-gray-800 font-medium text-center leading-tight w-full px-1 truncate table-guest-name`}
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
                className="absolute z-50 glass-card bg-white/95 backdrop-blur-md border-2 border-rose-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                style={{ top: menuPos.y - table.y, left: menuPos.x - table.x }}
              >
                <button
                  className="px-5 py-3 hover:bg-gradient-to-r hover:from-blue-500 hover:to-blue-600 hover:text-white transition-all font-medium border-b border-rose-100 flex items-center gap-2"
                  onClick={() => {
                    setMenuVisible(false);
                    setEditingTable(table);
                  }}
                >
                  <Edit3 size={16} />
                  Editar
                </button>
                <button
                  className="px-5 py-3 hover:bg-gradient-to-r hover:from-purple-500 hover:to-purple-600 hover:text-white transition-all font-medium border-b border-rose-100 flex items-center gap-2"
                  onClick={() => {
                    setMenuVisible(false);
                    setTableSummary(table);
                  }}
                >
                  <Users size={16} />
                  Ver Resumen
                </button>
                <button
                  className="px-5 py-3 hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 hover:text-white transition-all font-medium flex items-center gap-2"
                  onClick={() => {
                    setMenuVisible(false);
                    if (confirm(`¿Eliminar ${table.name}?`)) deleteTable(table.id);
                  }}
                >
                  <Trash2 size={16} />
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
                className={`seat absolute w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs cursor-pointer transition-all duration-200 group shadow-md
                  ${guest
                    ? 'bg-gradient-to-br from-violet-400 to-indigo-500 text-white border-violet-300 hover:from-violet-500 hover:to-indigo-600 hover:shadow-lg hover:scale-110'
                    : 'bg-white border-violet-300 hover:border-violet-500 hover:bg-violet-50 hover:scale-105'
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
    <div className="flex h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 text-gray-800 relative overflow-hidden">
      {/* Toaster para notificaciones */}
      <Toaster position="top-right" />

      {/* Decoración de fondo sutil */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-10 left-10 w-96 h-96 bg-[#a8b5a1]/10 rounded-full mix-blend-multiply filter blur-3xl animate-float"></div>
        <div className="absolute top-1/2 right-10 w-96 h-96 bg-[#7fa99b]/10 rounded-full mix-blend-multiply filter blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-[#8b9ca6]/10 rounded-full mix-blend-multiply filter blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
      </div>
      {/* Zona principal */}
      <div className="flex-1 relative overflow-auto z-10">
        {/* Header minimalista y elegante */}
        <div className="absolute top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-20">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 md:py-4">
            <div className="flex items-center justify-between">
              {/* Logo y título */}
              <div className="flex items-center gap-2 md:gap-4">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#a8b5a1]"></div>
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#7fa99b]"></div>
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#8b9ca6]"></div>
                </div>
                <div className="border-l border-gray-300 pl-2 md:pl-4">
                  <h1 className="text-base md:text-xl font-medium text-gray-900 tracking-tight">Wedding Seating Planner</h1>
                  <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">By Jose Luis Caceres</p>
                </div>
              </div>

              {/* Desktop: Stats */}
              <div className="hidden lg:flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-2 h-2 rounded-full bg-[#a8b5a1]"></div>
                  <span className="font-medium text-gray-700">{tables.length}</span>
                  <span className="text-gray-500">mesas</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-2 h-2 rounded-full bg-[#7fa99b]"></div>
                  <span className="font-medium text-gray-700">{guests.length}</span>
                  <span className="text-gray-500">invitados</span>
                </div>
              </div>

              {/* Mobile: Menu buttons */}
              <div className="flex items-center gap-2 lg:hidden">
                <button
                  onClick={() => setShowMobileSidebar(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Ver invitados"
                >
                  <Users size={20} className="text-gray-700" />
                </button>
                <button
                  onClick={() => setShowMobileMenu(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Menú"
                >
                  <Menu size={20} className="text-gray-700" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar minimalista - Solo desktop */}
        <div className="absolute top-16 md:top-20 left-0 right-0 z-10 px-4 md:px-8 py-2 md:py-3 animate-fadeIn hidden lg:block">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-3">
              <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setShowAddTable(true)}
            className="bg-[#a8b5a1] hover:bg-[#8b9e8a] text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md flex items-center gap-2 text-sm font-medium transition-all"
          >
            <Plus size={16} />
            <span>Nueva Mesa</span>
          </button>
          <button
            onClick={() => setShowAddGuests(true)}
            className="bg-[#7fa99b] hover:bg-[#6b8f82] text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md flex items-center gap-2 text-sm font-medium transition-all"
          >
            <UserPlus size={16} />
            <span>Añadir Invitados</span>
          </button>
          <button
            onClick={() => setShowManageGroups(true)}
            className="bg-[#c9b8a8] hover:bg-[#b5a598] text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md flex items-center gap-2 text-sm font-medium transition-all"
          >
            <Tag size={16} />
            <span>Gestionar Grupos</span>
          </button>
           <button
              onClick={() => setShowImportGuests(true)}
              className="bg-[#8b9ca6] hover:bg-[#758593] text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md flex items-center gap-2 text-sm font-medium transition-all"
            >
              <FileUp size={16} />
              <span>Importar</span>
            </button>
          <button
            onClick={exportPDF}
            className="bg-[#c9b8a8] hover:bg-[#b5a598] text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md flex items-center gap-2 text-sm font-medium transition-all"
          >
            <Download size={16} />
            <span>Exportar PDF</span>
          </button>
          <button
            onClick={saveProgress}
            className="bg-[#7fa99b] hover:bg-[#6b8f82] text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md flex items-center gap-2 text-sm font-medium transition-all"
          >
            <Save size={16} />
            <span>Guardar</span>
          </button>
          <button
            onClick={resetAllData}
            className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md flex items-center gap-2 text-sm font-medium transition-all"
          >
            <RotateCcw size={16} />
            <span>Resetear</span>
          </button>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="relative p-4 md:p-8 lg:p-12 mt-16 md:mt-20 lg:mt-40 overflow-auto"
          style={{ minWidth: '2000px', minHeight: '1500px' }}
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

      {/* Panel lateral - Desktop */}
      <div className="hidden lg:flex w-96 bg-gradient-to-b from-gray-50 to-white border-l border-gray-200 flex-col shadow-xl z-10 relative">
        <div className="p-6 border-b border-gray-200 bg-white relative z-10">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <Sparkles size={20} className="text-[#a8b5a1]" /> Estadísticas
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
              <span className="flex items-center gap-2 text-gray-700"><Users size={16} className="text-[#7fa99b]" />Total invitados</span>
              <span className="font-bold text-lg text-gray-900">{guests.length}</span>
            </div>
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
              <span className="flex items-center gap-2 text-gray-700">✓ Asignados</span>
              <span className="font-bold text-lg text-[#7fa99b]">{assignedGuests.length}</span>
            </div>
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
              <span className="flex items-center gap-2 text-gray-700">⏳ Sin asignar</span>
              <span className="font-bold text-lg text-[#c9b8a8]">{unassignedGuests.length}</span>
            </div>
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
              <span className="flex items-center gap-2 text-gray-700">🪑 Mesas</span>
              <span className="font-bold text-lg text-gray-900">{tables.length}</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-gray-200 bg-white/95 backdrop-blur-sm relative z-10">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar invitado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-3 rounded-xl bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-[#a8b5a1] focus:ring-1 focus:ring-[#a8b5a1]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 p-1 hover:bg-gray-100 rounded-full transition-colors"
                title="Limpiar búsqueda"
              >
                <X size={16} className="text-gray-400" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 relative z-10">
          {unassignedGuests.filter(g =>
              g.name.toLowerCase().includes(searchTerm.toLowerCase())
            ).map((guest, index) => {
              const groupColor = getGroupColor(guest.group || 'other');
              return (
              <motion.div
                key={guest.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, type: 'spring', stiffness: 300, damping: 25 }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setDraggedGuest(guest);
                  setIsDragging(true);
                  setDragPos({ x: e.clientX, y: e.clientY });
                }}
                className="bg-white/90 backdrop-blur-sm p-3 rounded-lg cursor-move hover:bg-white transition-all border border-gray-200 hover:border-gray-300 hover:shadow-md group"
                style={{
                  borderLeftWidth: '3px',
                  borderLeftColor: groupColor
                }}
                title={guest.name}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-sm"
                    style={{ backgroundColor: groupColor }}
                  >
                    {guest.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-800 text-sm group-hover:text-gray-900 transition-colors">{guest.name}</span>
                </div>
              </motion.div>
            );
          })}
          {unassignedGuests.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
            <div className="text-center text-gray-400 py-12">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm">No hay invitados sin asignar</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal añadir mesa */}
      {showAddTable && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 animate-fadeIn">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-card bg-white rounded-2xl p-8 shadow-2xl w-96 border-2 border-rose-200"
          >
            <h3 className="elegant-title text-2xl font-bold mb-6 text-rose-600 flex items-center gap-2">
              <Plus className="bg-rose-100 rounded-full p-1" size={28} />
              Añadir Mesa
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la mesa</label>
                <input
                  type="text"
                  placeholder="Ej: Mesa Principal"
                  value={newTableData.name}
                  onChange={(e) => setNewTableData({ ...newTableData, name: e.target.value })}
                  className="w-full border-2 border-rose-200 rounded-xl p-3 focus:border-rose-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de mesa</label>
                <select
                  value={newTableData.type}
                  onChange={(e) => setNewTableData({ ...newTableData, type: e.target.value })}
                  className="w-full border-2 border-rose-200 rounded-xl p-3 focus:border-rose-400 transition-colors"
                >
                  <option value="round">Redonda ●</option>
                  <option value="rectangular">Rectangular ▭</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Capacidad (número de asientos)</label>
                <input
                  type="number"
                  min="1"
                  value={newTableData.capacity}
                  onChange={(e) => setNewTableData({ ...newTableData, capacity: e.target.value })}
                  className="w-full border-2 border-rose-200 rounded-xl p-3 focus:border-rose-400 transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddTable(false)} className="flex-1 px-5 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 font-medium transition-colors">Cancelar</button>
              <button onClick={addTable} className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-medium shadow-lg transition-all">Añadir</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal editar mesa */}
      {editingTable && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 animate-fadeIn">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card bg-white rounded-2xl p-8 shadow-2xl w-96 border-2 border-blue-200"
          >
            <h3 className="elegant-title text-2xl font-bold mb-6 text-blue-600 flex items-center gap-2">
              <Edit3 className="bg-blue-100 rounded-full p-1" size={28} />
              Editar Mesa
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la mesa</label>
                <input
                  type="text"
                  placeholder="Nombre de mesa"
                  value={editingTable.name}
                  onChange={(e) => setEditingTable({ ...editingTable, name: e.target.value })}
                  className="w-full border-2 border-blue-200 rounded-xl p-3 focus:border-blue-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de mesa</label>
                <select
                  value={editingTable.type}
                  onChange={(e) => setEditingTable({ ...editingTable, type: e.target.value })}
                  className="w-full border-2 border-blue-200 rounded-xl p-3 focus:border-blue-400 transition-colors"
                >
                  <option value="round">Redonda ●</option>
                  <option value="rectangular">Rectangular ▭</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Capacidad</label>
                <input
                  type="number"
                  min="1"
                  value={editingTable.capacity}
                  onChange={(e) => setEditingTable({ ...editingTable, capacity: e.target.value })}
                  className="w-full border-2 border-blue-200 rounded-xl p-3 focus:border-blue-400 transition-colors"
                />
              </div>
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-red-500 rounded"
                    onChange={(e) => {
                      if (e.target.checked) {
                        const updatedGuests = guests.map(g =>
                          g.tableId === editingTable.id ? { ...g, tableId: null, seatIndex: null } : g
                        );
                        setGuests(updatedGuests);
                      }
                    }}
                  />
                  <span className="text-sm font-medium text-red-700">Borrar invitados asignados</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingTable(null)} className="flex-1 px-5 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 font-medium transition-colors">Cancelar</button>
              <button onClick={saveEditedTable} className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium shadow-lg transition-all">Guardar</button>
            </div>
          </motion.div>
        </div>
      )}


      {/* Modal añadir invitados */}
      {showAddGuests && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 animate-fadeIn">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 shadow-2xl w-[480px] border border-gray-200"
          >
            <h3 className="text-2xl font-semibold mb-6 text-gray-900 flex items-center gap-2">
              <UserPlus className="text-[#7fa99b]" size={28} />
              Añadir Invitados
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grupo</label>
                <select
                  value={newGuestGroup}
                  onChange={(e) => setNewGuestGroup(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:border-[#a8b5a1] transition-colors"
                >
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getGroupColor(newGuestGroup) }}></div>
                  <span className="text-xs text-gray-500">Color del grupo seleccionado</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombres (uno por línea)</label>
                <textarea
                  placeholder="Ana García&#10;Carlos López&#10;María Martínez..."
                  value={newGuestNames}
                  onChange={(e) => setNewGuestNames(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 h-48 focus:border-[#a8b5a1] transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddGuests(false)} className="flex-1 px-5 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 font-medium transition-colors text-gray-700">Cancelar</button>
              <button onClick={addGuests} className="flex-1 px-5 py-3 rounded-lg bg-[#7fa99b] hover:bg-[#6b8f82] text-white font-medium shadow-sm transition-all">Añadir</button>
            </div>
          </motion.div>
        </div>
      )}

      {isDragging && draggedGuest && (
        <motion.div
          className="w-12 h-12 rounded-full text-white flex items-center justify-center shadow-2xl z-50 fixed top-0 left-0 pointer-events-none font-semibold text-sm"
          style={{
            x: dragPos.x - 24,
            y: dragPos.y - 24,
            backgroundColor: getGroupColor(draggedGuest.group || 'other')
          }}
          initial={{ scale: 0.8, opacity: 0.8 }}
          animate={{ scale: 1.1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          {draggedGuest.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </motion.div>
      )}
      {tableSummary && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 animate-fadeIn">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card bg-white rounded-2xl p-8 shadow-2xl w-[500px] max-h-[80vh] overflow-y-auto border-2 border-purple-200"
          >
            <h3 className="elegant-title text-3xl font-bold mb-6 text-purple-600 flex items-center gap-3">
              <Heart className="text-rose-500" size={32} />
              {tableSummary.name}
            </h3>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-2 border-purple-200">
                  <p className="text-sm text-gray-600 mb-1">Tipo</p>
                  <p className="text-lg font-bold text-purple-600">{tableSummary.type === 'round' ? '● Redonda' : '▭ Rectangular'}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border-2 border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">Capacidad Total</p>
                  <p className="text-lg font-bold text-blue-600">{tableSummary.capacity} asientos</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Ocupados</p>
                  <p className="text-lg font-bold text-green-600">{tableSummary.seats.filter((_, idx) => guests.some(g => g.tableId === tableSummary.id && g.seatIndex === idx)).length}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border-2 border-amber-200">
                  <p className="text-sm text-gray-600 mb-1">Libres</p>
                  <p className="text-lg font-bold text-amber-600">{tableSummary.capacity - tableSummary.seats.filter((_, idx) => guests.some(g => g.tableId === tableSummary.id && g.seatIndex === idx)).length}</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="elegant-title text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                <Users size={20} className="text-rose-500" />
                Invitados Asignados
              </h4>
              {guests.filter(g => g.tableId === tableSummary.id).length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <Users size={48} className="mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500">No hay invitados asignados a esta mesa</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {guests
                    .filter(g => g.tableId === tableSummary.id)
                    .map((g, index) => (
                      <div key={g.id} className="flex items-center gap-3 bg-gradient-to-r from-rose-50 to-pink-50 p-3 rounded-xl border border-rose-200">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {g.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{g.name}</p>
                          <p className="text-xs text-gray-500">{g.seatIndex !== null ? `Asiento ${g.seatIndex + 1}` : 'Sin asiento asignado'}</p>
                        </div>
                      </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium shadow-lg transition-all"
                onClick={() => setTableSummary(null)}
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Menú hamburguesa móvil */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
              onClick={() => setShowMobileMenu(false)}
            />

            {/* Menú */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-80 bg-white shadow-2xl z-50 lg:hidden overflow-y-auto"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Menú</h2>
                  <button
                    onClick={() => setShowMobileMenu(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>

                {/* Estadísticas */}
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Sparkles size={16} className="text-[#a8b5a1]" />
                    Estadísticas
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2 rounded-lg border border-gray-200">
                      <p className="text-gray-500">Invitados</p>
                      <p className="text-lg font-bold text-gray-900">{guests.length}</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-gray-200">
                      <p className="text-gray-500">Asignados</p>
                      <p className="text-lg font-bold text-[#7fa99b]">{assignedGuests.length}</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-gray-200">
                      <p className="text-gray-500">Sin asignar</p>
                      <p className="text-lg font-bold text-[#c9b8a8]">{unassignedGuests.length}</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-gray-200">
                      <p className="text-gray-500">Mesas</p>
                      <p className="text-lg font-bold text-gray-900">{tables.length}</p>
                    </div>
                  </div>
                </div>

                {/* Opciones del menú */}
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      setShowAddTable(true);
                    }}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#a8b5a1] rounded-lg">
                        <Plus size={20} className="text-white" />
                      </div>
                      <span className="font-medium text-gray-900">Nueva Mesa</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                  </button>

                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      setShowAddGuests(true);
                    }}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#7fa99b] rounded-lg">
                        <UserPlus size={20} className="text-white" />
                      </div>
                      <span className="font-medium text-gray-900">Añadir Invitados</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                  </button>

                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      setShowManageGroups(true);
                    }}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#c9b8a8] rounded-lg">
                        <Tag size={20} className="text-white" />
                      </div>
                      <span className="font-medium text-gray-900">Gestionar Grupos</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                  </button>

                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      setShowImportGuests(true);
                    }}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#8b9ca6] rounded-lg">
                        <FileUp size={20} className="text-white" />
                      </div>
                      <span className="font-medium text-gray-900">Importar Excel/CSV</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                  </button>

                  <div className="h-px bg-gray-200 my-4"></div>

                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      exportPDF();
                    }}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#c9b8a8] rounded-lg">
                        <Download size={20} className="text-white" />
                      </div>
                      <span className="font-medium text-gray-900">Exportar PDF</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                  </button>

                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      saveProgress();
                    }}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#7fa99b] rounded-lg">
                        <Save size={20} className="text-white" />
                      </div>
                      <span className="font-medium text-gray-900">Guardar Progreso</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                  </button>

                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      resetAllData();
                    }}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-400 rounded-lg">
                        <RotateCcw size={20} className="text-white" />
                      </div>
                      <span className="font-medium text-gray-900">Resetear Todo</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar móvil de invitados */}
      <AnimatePresence>
        {showMobileSidebar && !isDragging && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[55] lg:hidden"
              onClick={() => setShowMobileSidebar(false)}
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-white shadow-2xl z-[60] lg:hidden flex flex-col"
            >
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Invitados</h2>
                  <button
                    onClick={() => setShowMobileSidebar(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>

                {/* Búsqueda */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar invitado..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-9 py-2.5 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 text-sm focus:border-[#a8b5a1] focus:ring-1 focus:ring-[#a8b5a1]"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-3 p-0.5 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      <X size={14} className="text-gray-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de invitados */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {unassignedGuests.filter(g =>
                    g.name.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((guest, index) => {
                    const groupColor = getGroupColor(guest.group || 'other');
                    return (
                    <motion.div
                      key={guest.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      draggable
                      onDragStart={(e) => {
                        setDraggedGuest(guest);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onTouchStart={(e) => {
                        setDraggedGuest(guest);
                        setIsDragging(true);
                        const touch = e.touches[0];
                        setDragPos({ x: touch.clientX, y: touch.clientY });
                        setShowMobileSidebar(false); // Cerrar sidebar al arrastrar
                      }}
                      className="bg-gray-50 p-3 rounded-lg border border-gray-200 cursor-move active:opacity-50"
                      style={{
                        borderLeftWidth: '3px',
                        borderLeftColor: groupColor
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-sm flex-shrink-0"
                          style={{ backgroundColor: groupColor }}
                        >
                          {guest.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-800 text-sm">{guest.name}</span>
                      </div>
                    </motion.div>
                  );
                })}
                {unassignedGuests.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                  <div className="text-center text-gray-400 py-12">
                    <Users size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No hay invitados sin asignar</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Indicador visual de drag táctil - Círculo/Pelota */}
      {isDragging && draggedGuest && (
        <div
          className="fixed pointer-events-none z-[100] transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: dragPos.x,
            top: dragPos.y,
          }}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.95 }}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 shadow-2xl flex items-center justify-center text-white font-bold text-lg border-4 border-white/30"
          >
            {draggedGuest.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </motion.div>
        </div>
      )}

      {/* Modal de gestión de grupos */}
      {showManageGroups && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 animate-fadeIn">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 shadow-2xl w-[600px] max-h-[80vh] overflow-hidden flex flex-col border border-gray-200"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <Tag className="text-[#c9b8a8]" size={28} />
                Gestionar Grupos
              </h3>
              <button
                onClick={() => setShowManageGroups(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Formulario para añadir grupo */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Crear Nuevo Grupo</h4>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Nombre del grupo"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:border-[#a8b5a1] transition-colors text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && addGroup()}
                  />
                </div>
                <div className="w-32">
                  <div className="relative">
                    <select
                      value={newGroupColor}
                      onChange={(e) => setNewGroupColor(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:border-[#a8b5a1] transition-colors text-sm appearance-none cursor-pointer"
                      style={{ paddingLeft: '36px' }}
                    >
                      {AVAILABLE_COLORS.map(color => (
                        <option key={color} value={color}>
                          Color
                        </option>
                      ))}
                    </select>
                    <div
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-sm pointer-events-none"
                      style={{ backgroundColor: newGroupColor }}
                    ></div>
                  </div>
                </div>
                <button
                  onClick={addGroup}
                  className="bg-[#a8b5a1] hover:bg-[#8b9e8a] text-white px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md flex items-center gap-2 text-sm font-medium transition-all"
                >
                  <Plus size={16} />
                  <span>Añadir</span>
                </button>
              </div>
            </div>

            {/* Lista de grupos */}
            <div className="flex-1 overflow-y-auto">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Grupos Existentes ({groups.length})</h4>
              <div className="space-y-2">
                {groups.map((group) => {
                  const guestsCount = guests.filter(g => g.group === group.id).length;
                  return (
                    <motion.div
                      key={group.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors group"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-8 h-8 rounded-full shadow-sm"
                          style={{ backgroundColor: group.color }}
                        ></div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 text-sm">{group.name}</p>
                          <p className="text-xs text-gray-500">
                            {guestsCount} invitado{guestsCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteGroup(group.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Eliminar grupo"
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowManageGroups(false)}
                className="w-full px-5 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 font-medium transition-colors text-gray-700"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal importar invitados desde Excel/CSV */}
        {showImportGuests && (
          <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 animate-fadeIn">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card bg-white rounded-2xl p-8 shadow-2xl w-[500px] border-2 border-purple-200"
            >
              <h3 className="elegant-title text-2xl font-bold mb-6 text-purple-600 flex items-center gap-2">
                <FileUp className="bg-purple-100 rounded-full p-1" size={28} />
                Importar Invitados
              </h3>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  Selecciona un archivo Excel (.xlsx, .xls) o CSV con una columna de nombres.
                </p>

                <div className="border-2 border-dashed border-purple-300 rounded-2xl p-6 text-center bg-purple-50/50 hover:bg-purple-50 transition-colors">
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
                    <FileUp className="mx-auto mb-3 text-purple-400" size={40} />
                    <span className="text-base font-medium text-gray-700 block mb-1">
                      {importFile ? importFile.name : 'Haz clic para seleccionar archivo'}
                    </span>
                    <span className="text-xs text-gray-500">
                      Formatos: .xlsx, .xls, .csv
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

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowImportGuests(false);
                    setImportFile(null);
                    setImportStatus('');
                  }}
                  className="flex-1 px-5 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importFile}
                  className={`flex-1 px-5 py-3 rounded-xl text-white font-medium shadow-lg transition-all ${
                    importFile
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  Importar
                </button>
              </div>

              {/* Información de formato */}
              <div className="mt-6 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200">
                <h4 className="font-bold text-sm mb-2 text-amber-800 flex items-center gap-2">
                  <Sparkles size={16} />
                  Formato esperado:
                </h4>
                <div className="text-xs text-amber-700 space-y-1">
                  <p>• <strong>Excel/CSV</strong> con una columna de nombres</p>
                  <p>• <strong>Ejemplo:</strong> Columna A: "Ana García", "Carlos López"</p>
                  <p>• Se ignorarán las demás columnas</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
    </div>
  );
};

export default WeddingSeatingApp;
