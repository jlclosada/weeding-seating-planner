import React, { useState, useEffect, useRef } from 'react';
import { Search, Users, Plus, Trash2, UserPlus, Edit3, FileUp, Heart, Sparkles, Download, Save, RotateCcw, Tag, X, Menu, ChevronRight, Wand2, Shuffle, Undo2, Redo2, StickyNote, BarChart3, FileDown, ChevronDown, Filter, Eye, EyeOff, Settings, Printer, FileSpreadsheet, ZoomIn, ZoomOut, Maximize2, Lightbulb, Gift, Clock, CheckSquare, Copy, Share2, QrCode, MessageSquare, History, Layers, AlertCircle, UserX, UserCheck, Calendar, DollarSign, ShoppingCart, Layout, TrendingUp, Award, Zap } from 'lucide-react';
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

// Templates predefinidos
const EVENT_TEMPLATES = [
  {
    id: 'wedding',
    name: 'Boda Clásica',
    icon: '💒',
    description: 'Configuración tradicional para bodas',
    tables: [
      { name: 'Mesa Principal', type: 'rectangular', capacity: 12 },
      { name: 'Mesa 1', type: 'round', capacity: 10 },
      { name: 'Mesa 2', type: 'round', capacity: 10 },
      { name: 'Mesa 3', type: 'round', capacity: 10 },
      { name: 'Mesa 4', type: 'round', capacity: 10 },
      { name: 'Mesa 5', type: 'round', capacity: 10 },
    ],
    groups: [
      { id: 'family', name: 'Familia', color: '#a8b5a1' },
      { id: 'friends', name: 'Amigos', color: '#FACCC0' },
      { id: 'couple', name: 'Pareja', color: '#c9b8a8' },
    ]
  },
  {
    id: 'corporate',
    name: 'Evento Corporativo',
    icon: '💼',
    description: 'Ideal para conferencias y eventos de empresa',
    tables: [
      { name: 'Mesa Ejecutivos', type: 'rectangular', capacity: 8 },
      { name: 'Equipo A', type: 'round', capacity: 8 },
      { name: 'Equipo B', type: 'round', capacity: 8 },
      { name: 'Equipo C', type: 'round', capacity: 8 },
    ],
    groups: [
      { id: 'executives', name: 'Ejecutivos', color: '#8b9ca6' },
      { id: 'employees', name: 'Empleados', color: '#b8a5b0' },
      { id: 'clients', name: 'Clientes', color: '#c9b8a8' },
    ]
  },
  {
    id: 'quinceanera',
    name: 'Quinceañera',
    icon: '👑',
    description: 'Perfecta para celebraciones de 15 años',
    tables: [
      { name: 'Mesa de Honor', type: 'rectangular', capacity: 10 },
      { name: 'Familia', type: 'round', capacity: 10 },
      { name: 'Amigos Cercanos', type: 'round', capacity: 10 },
      { name: 'Compañeros', type: 'round', capacity: 10 },
    ],
    groups: [
      { id: 'family', name: 'Familia', color: '#a8b5a1' },
      { id: 'close-friends', name: 'Amigos Cercanos', color: '#FACCC0' },
      { id: 'school', name: 'Compañeros', color: '#d4c4b0' },
    ]
  }
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
  const longPressTimer = useRef(null);
  const [isDraggingTable, setIsDraggingTable] = useState(false);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const [longPressActive, setLongPressActive] = useState(false);
  const [hoveredSeat, setHoveredSeat] = useState(null);
  const [editingGuest, setEditingGuest] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showStats, setShowStats] = useState(false);
  const [tableNotes, setTableNotes] = useState({});
  const [editingTableNote, setEditingTableNote] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeGroupFilter, setActiveGroupFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedGuests, setHighlightedGuests] = useState([]);
  const actionsMenuRef = useRef(null);
  const exportMenuRef = useRef(null);
  const filterMenuRef = useRef(null);
  const toolsMenuRef = useRef(null);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Nuevos estados para funcionalidades avanzadas
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);
  const [showAdvancedDashboard, setShowAdvancedDashboard] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showGuestView, setShowGuestView] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showBudget, setShowBudget] = useState(false);

  // Datos para nuevas funcionalidades
  const [guestTags, setGuestTags] = useState({});
  const [availableTags, setAvailableTags] = useState(['VIP', 'Menú Especial', 'Niño', 'Vegetariano']);
  const [conflicts, setConflicts] = useState([]);
  const [mustSitTogether, setMustSitTogether] = useState([]);
  const [timeline, setTimeline] = useState([
    { id: 1, name: 'Llegada de invitados', time: '18:00', duration: 30 },
    { id: 2, name: 'Ceremonia', time: '18:30', duration: 45 },
    { id: 3, name: 'Cóctel', time: '19:15', duration: 60 },
    { id: 4, name: 'Cena', time: '20:15', duration: 90 },
    { id: 5, name: 'Baile', time: '21:45', duration: 120 },
  ]);
  const [checklist, setChecklist] = useState([
    { id: 1, task: 'Enviar invitaciones', completed: false, category: 'Invitaciones' },
    { id: 2, task: 'Confirmar menú', completed: false, category: 'Catering' },
    { id: 3, task: 'Contratar fotografía', completed: false, category: 'Servicios' },
    { id: 4, task: 'Decoración de mesas', completed: false, category: 'Decoración' },
    { id: 5, task: 'Música/DJ', completed: false, category: 'Entretenimiento' },
  ]);
  const [savedVersions, setSavedVersions] = useState([]);
  const [budgetItems, setBudgetItems] = useState([
    { id: 1, item: 'Sillas', unitPrice: 5, quantity: 0, category: 'Mobiliario' },
    { id: 2, item: 'Manteles', unitPrice: 15, quantity: 0, category: 'Decoración' },
    { id: 3, item: 'Centros de mesa', unitPrice: 30, quantity: 0, category: 'Decoración' },
    { id: 4, item: 'Vajilla', unitPrice: 8, quantity: 0, category: 'Catering' },
  ]);

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

  // 🔹 Cerrar menús desplegables al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setShowActionsMenu(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target)) {
        if (activeGroupFilter === 'menu') {
          setActiveGroupFilter(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeGroupFilter]);

  // 🔹 Cerrar menú de herramientas al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target)) {
        setShowToolsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Manejo de drag táctil para mesas con long-press
  const handleTouchStartTable = (e, tableId) => {
    e.stopPropagation(); // Prevenir que el canvas también reciba el evento
    const touch = e.touches[0];
    const table = tables.find(t => t.id === tableId);
    const startX = touch.clientX;
    const startY = touch.clientY;
    const offsetX = startX - table.x;
    const offsetY = startY - table.y;
    let hasMoved = false;
    let isDragging = false;

    setLongPressActive(true);

    // Timer corto para iniciar drag (300ms)
    const dragTimer = setTimeout(() => {
      setLongPressActive(false);
      isDragging = true;
      if (navigator.vibrate) navigator.vibrate(30);

      const handleTouchMove = (ev) => {
        if (!isDragging) return;
        ev.preventDefault();
        ev.stopPropagation();
        const touch = ev.touches[0];
        const newX = touch.clientX - offsetX;
        const newY = touch.clientY - offsetY;
        setTables(prev => prev.map(t => t.id === tableId ? { ...t, x: newX, y: newY } : t));
      };

      const handleTouchEnd = (ev) => {
        ev.stopPropagation();
        isDragging = false;
        setIsDraggingTable(false);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };

      setIsDraggingTable(true);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }, 300);

    // Timer largo para menú contextual (800ms)
    const menuTimer = setTimeout(() => {
      if (!hasMoved && !isDragging) {
        clearTimeout(dragTimer);
        setLongPressActive(false);
        if (navigator.vibrate) navigator.vibrate([30, 50, 30]);

        // Abrir menú contextual
        const rect = e.target.getBoundingClientRect();
        const menuEvent = {
          preventDefault: () => {},
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2
        };
        // Simular el handleContextMenu del componente
        e.target.dispatchEvent(new MouseEvent('contextmenu', {
          bubbles: true,
          clientX: menuEvent.clientX,
          clientY: menuEvent.clientY
        }));
      }
    }, 800);

    const handleMove = (ev) => {
      const touch = ev.touches[0];
      const deltaX = Math.abs(touch.clientX - startX);
      const deltaY = Math.abs(touch.clientY - startY);

      if (deltaX > 10 || deltaY > 10) {
        hasMoved = true;
        if (!isDragging) {
          clearTimeout(dragTimer);
          clearTimeout(menuTimer);
          setLongPressActive(false);
        }
        document.removeEventListener('touchmove', handleMove);
      }
    };

    const clearTimers = () => {
      clearTimeout(dragTimer);
      clearTimeout(menuTimer);
      setLongPressActive(false);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', clearTimers);
    };

    document.addEventListener('touchmove', handleMove, { passive: true });
    document.addEventListener('touchend', clearTimers, { once: true });
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

  // Editar invitado
  const updateGuest = (guestId, updates) => {
    setGuests(prevGuests =>
      prevGuests.map(g => g.id === guestId ? { ...g, ...updates } : g)
    );
  };

  // Guardar edición de invitado
  const saveEditedGuest = () => {
    if (!editingGuest) return;

    if (!editingGuest.name.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }

    updateGuest(editingGuest.id, {
      name: editingGuest.name.trim(),
      group: editingGuest.group
    });

    setEditingGuest(null);
    toast.success('Invitado actualizado correctamente', {
      icon: '✅',
    });
  };

  // Eliminar invitado
  const deleteGuest = (guestId) => {
    if (confirm('¿Estás seguro de que quieres eliminar este invitado?')) {
      setGuests(prevGuests => prevGuests.filter(g => g.id !== guestId));
      toast.success('Invitado eliminado', {
        icon: '🗑️',
      });
    }
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

  // Guardar estado en historial para undo/redo
  const saveToHistory = () => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(guests)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Deshacer
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setGuests(JSON.parse(JSON.stringify(history[historyIndex - 1])));
      toast.success('Cambios deshechos', { icon: '↩️' });
    }
  };

  // Rehacer
  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setGuests(JSON.parse(JSON.stringify(history[historyIndex + 1])));
      toast.success('Cambios rehechos', { icon: '↪️' });
    }
  };

  // Asignación automática inteligente por grupos
  const autoAssignSeats = () => {
    if (guests.length === 0) {
      toast.error('Necesitas invitados para asignar automáticamente');
      return;
    }

    saveToHistory();

    // Obtener todos los asientos disponibles
    let availableSeats = [];
    let currentTables = [...tables];

    tables.forEach(table => {
      for (let i = 0; i < table.capacity; i++) {
        availableSeats.push({ tableId: table.id, seatIndex: i });
      }
    });

    // Si no hay suficientes asientos, crear mesas automáticamente
    if (guests.length > availableSeats.length) {
      const seatsNeeded = guests.length - availableSeats.length;
      const tablesNeeded = Math.ceil(seatsNeeded / 10); // 10 personas por mesa

      toast.loading(`Creando ${tablesNeeded} mesa(s) adicional(es)...`, { id: 'creating-tables' });

      const newTables = [];
      for (let i = 0; i < tablesNeeded; i++) {
        const newTable = {
          id: Date.now() + i,
          name: `Mesa ${tables.length + i + 1}`,
          type: 'round',
          capacity: 10,
          x: 150 + (tables.length + i) * 80,
          y: 150 + Math.floor((tables.length + i) / 5) * 200,
          seats: Array(10).fill(null)
        };
        newTables.push(newTable);

        // Añadir asientos de la nueva mesa
        for (let j = 0; j < newTable.capacity; j++) {
          availableSeats.push({ tableId: newTable.id, seatIndex: j });
        }
      }

      currentTables = [...tables, ...newTables];
      setTables(currentTables);

      toast.success(`✨ ${tablesNeeded} mesa(s) creada(s) automáticamente`, { id: 'creating-tables' });
    }

    // Agrupar invitados por grupo
    const guestsByGroup = {};
    guests.forEach(guest => {
      const groupId = guest.group || 'other';
      if (!guestsByGroup[groupId]) {
        guestsByGroup[groupId] = [];
      }
      guestsByGroup[groupId].push(guest);
    });

    // Asignar invitados por grupo, intentando mantenerlos juntos
    const newGuests = [...guests];
    let seatIndex = 0;

    Object.values(guestsByGroup).forEach(groupGuests => {
      groupGuests.forEach(guest => {
        if (seatIndex < availableSeats.length) {
          const seat = availableSeats[seatIndex];
          const guestIdx = newGuests.findIndex(g => g.id === guest.id);
          newGuests[guestIdx] = {
            ...newGuests[guestIdx],
            tableId: seat.tableId,
            seatIndex: seat.seatIndex
          };
          seatIndex++;
        }
      });
    });

    setGuests(newGuests);
    toast.success(`🎯 ${guests.length} invitados asignados automáticamente`, {
      duration: 3000,
    });
  };

  // Modo Madness - Asignación aleatoria
  const madnessMode = () => {
    if (guests.length === 0) {
      toast.error('Necesitas invitados para el modo Madness');
      return;
    }

    saveToHistory();

    // Obtener todos los asientos disponibles
    let availableSeats = [];
    let currentTables = [...tables];

    tables.forEach(table => {
      for (let i = 0; i < table.capacity; i++) {
        availableSeats.push({ tableId: table.id, seatIndex: i });
      }
    });

    // Si no hay suficientes asientos, crear mesas automáticamente
    if (guests.length > availableSeats.length) {
      const seatsNeeded = guests.length - availableSeats.length;
      const tablesNeeded = Math.ceil(seatsNeeded / 10); // 10 personas por mesa

      toast.loading(`🎲 Creando ${tablesNeeded} mesa(s) para el caos...`, { id: 'creating-madness-tables' });

      const newTables = [];
      for (let i = 0; i < tablesNeeded; i++) {
        const newTable = {
          id: Date.now() + i + 1000, // Offset para evitar conflictos de ID
          name: `Mesa Madness ${i + 1}`,
          type: Math.random() > 0.5 ? 'round' : 'rectangular', // Tipo aleatorio para más caos
          capacity: 10,
          x: 150 + (tables.length + i) * 80,
          y: 150 + Math.floor((tables.length + i) / 5) * 200,
          seats: Array(10).fill(null)
        };
        newTables.push(newTable);

        // Añadir asientos de la nueva mesa
        for (let j = 0; j < newTable.capacity; j++) {
          availableSeats.push({ tableId: newTable.id, seatIndex: j });
        }
      }

      currentTables = [...tables, ...newTables];
      setTables(currentTables);

      toast.success(`🤪 ${tablesNeeded} mesa(s) del caos creadas`, { id: 'creating-madness-tables' });
    }

    // Mezclar asientos aleatoriamente
    const shuffledSeats = availableSeats.sort(() => Math.random() - 0.5);

    // Asignar invitados aleatoriamente
    const newGuests = guests.map((guest, idx) => {
      if (idx < shuffledSeats.length) {
        return {
          ...guest,
          tableId: shuffledSeats[idx].tableId,
          seatIndex: shuffledSeats[idx].seatIndex
        };
      }
      return guest;
    });

    setGuests(newGuests);
    toast.success('🎲 ¡Modo Madness activado! Asientos asignados aleatoriamente', {
      duration: 3000,
      icon: '🤪',
    });
  };

  // Limpiar todas las asignaciones
  const clearAllAssignments = () => {
    if (confirm('¿Estás seguro de que quieres quitar todos los invitados de sus asientos?')) {
      saveToHistory();
      const newGuests = guests.map(g => ({ ...g, tableId: null, seatIndex: null }));
      setGuests(newGuests);
      toast.success('Todas las asignaciones eliminadas', { icon: '🧹' });
    }
  };

  // Búsqueda de invitados en el canvas
  const searchGuestInCanvas = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setHighlightedGuests([]);
      return;
    }

    const matches = guests.filter(g =>
      g.name.toLowerCase().includes(query.toLowerCase()) && g.tableId !== null
    );
    setHighlightedGuests(matches.map(g => g.id));

    if (matches.length > 0) {
      toast.success(`${matches.length} invitado(s) encontrado(s)`, { icon: '🔍' });
    } else {
      toast.error('No se encontraron invitados asignados con ese nombre');
    }
  };

  // Filtrar por grupo
  const toggleGroupFilter = (groupId) => {
    if (activeGroupFilter === groupId) {
      // Limpiar filtro
      setActiveGroupFilter(null);
      setHighlightedGuests([]);
      setSearchQuery('');
      toast.success('Filtro eliminado', { icon: '🚫' });
    } else {
      // Aplicar filtro
      setActiveGroupFilter(groupId);
      const groupGuests = guests.filter(g => g.group === groupId && g.tableId !== null);
      setHighlightedGuests(groupGuests.map(g => g.id));
      setSearchQuery('');
      const groupName = groups.find(gr => gr.id === groupId)?.name;
      toast.success(`Mostrando grupo: ${groupName}`, { icon: '🎯' });
    }
  };

  // Generar sugerencias inteligentes
  const generateSuggestions = () => {
    const suggestions = [];

    // Sugerencia 1: Mesas vacías
    const emptyTables = tables.filter(t => guests.filter(g => g.tableId === t.id).length === 0);
    if (emptyTables.length > 0) {
      suggestions.push({
        type: 'warning',
        icon: '⚠️',
        title: `${emptyTables.length} mesa(s) vacía(s)`,
        description: 'Considera eliminarlas o asignar invitados',
        action: () => {
          emptyTables.forEach(t => deleteTable(t.id));
          toast.success('Mesas vacías eliminadas');
        },
        actionText: 'Eliminar mesas vacías'
      });
    }

    // Sugerencia 2: Invitados sin asignar
    if (unassignedGuests.length > 0) {
      suggestions.push({
        type: 'info',
        icon: '👥',
        title: `${unassignedGuests.length} invitado(s) sin asignar`,
        description: 'Usa Auto-Asignar para distribuirlos automáticamente',
        action: autoAssignSeats,
        actionText: 'Auto-Asignar'
      });
    }

    // Sugerencia 3: Mesas con poca ocupación
    const underutilizedTables = tables.filter(t => {
      const occupancy = guests.filter(g => g.tableId === t.id).length;
      return occupancy > 0 && occupancy < t.capacity * 0.5;
    });
    if (underutilizedTables.length > 0) {
      suggestions.push({
        type: 'tip',
        icon: '💡',
        title: `${underutilizedTables.length} mesa(s) con baja ocupación`,
        description: 'Mesas ocupadas a menos del 50%. Considera redistribuir',
        action: null,
        actionText: null
      });
    }

    // Sugerencia 4: Grupos separados
    groups.forEach(group => {
      const groupGuests = guests.filter(g => g.group === group.id && g.tableId !== null);
      const tablesWithGroup = new Set(groupGuests.map(g => g.tableId));
      if (tablesWithGroup.size > 3 && groupGuests.length > 5) {
        suggestions.push({
          type: 'warning',
          icon: '🧩',
          title: `Grupo "${group.name}" muy disperso`,
          description: `${groupGuests.length} personas en ${tablesWithGroup.size} mesas diferentes`,
          action: null,
          actionText: null
        });
      }
    });

    // Sugerencia 5: Capacidad sobrante
    const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
    const surplus = totalCapacity - guests.length;
    if (surplus > 20) {
      suggestions.push({
        type: 'success',
        icon: '✅',
        title: 'Capacidad sobrada',
        description: `Tienes ${surplus} asientos extra. Perfecto para invitados de última hora`,
        action: null,
        actionText: null
      });
    }

    return suggestions;
  };

  // Exportar lista de invitados a Excel
  const exportGuestList = () => {
    const wb = XLSX.utils.book_new();

    // Hoja 1: Lista completa de invitados
    const guestData = guests.map(g => {
      const table = tables.find(t => t.id === g.tableId);
      const group = groups.find(gr => gr.id === g.group);
      return {
        'Nombre': g.name,
        'Grupo': group?.name || 'Sin grupo',
        'Mesa': table?.name || 'Sin asignar',
        'Asiento': g.seatIndex !== null ? g.seatIndex + 1 : '-',
        'Estado': g.tableId !== null ? 'Asignado' : 'Pendiente'
      };
    });
    const ws1 = XLSX.utils.json_to_sheet(guestData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Invitados');

    // Hoja 2: Resumen por mesa
    const tableData = tables.map(t => {
      const tableGuests = guests.filter(g => g.tableId === t.id);
      return {
        'Mesa': t.name,
        'Tipo': t.type === 'round' ? 'Redonda' : 'Rectangular',
        'Capacidad': t.capacity,
        'Ocupados': tableGuests.length,
        'Libres': t.capacity - tableGuests.length,
        'Porcentaje': `${Math.round((tableGuests.length / t.capacity) * 100)}%`
      };
    });
    const ws2 = XLSX.utils.json_to_sheet(tableData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Mesas');

    // Hoja 3: Resumen por grupo
    const groupData = groups.map(gr => {
      const groupGuests = guests.filter(g => g.group === gr.id);
      const assigned = groupGuests.filter(g => g.tableId !== null).length;
      return {
        'Grupo': gr.name,
        'Total': groupGuests.length,
        'Asignados': assigned,
        'Sin asignar': groupGuests.length - assigned,
        'Porcentaje': groupGuests.length > 0 ? `${Math.round((assigned / groupGuests.length) * 100)}%` : '0%'
      };
    });
    const ws3 = XLSX.utils.json_to_sheet(groupData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Grupos');

    XLSX.writeFile(wb, `invitados-boda-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Lista de invitados exportada a Excel', { icon: '📊' });
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



  // Aplicar template de evento
  const applyTemplate = (template) => {
    const newTables = template.tables.map((t, i) => ({
      id: Date.now() + i,
      name: t.name,
      type: t.type,
      capacity: t.capacity,
      x: 100 + (i % 3) * 250,
      y: 100 + Math.floor(i / 3) * 200,
      seats: Array(t.capacity).fill(null)
    }));

    setTables(newTables);
    setGroups(template.groups.map(g => ({ ...g, id: g.id + '-' + Date.now() })));
    setShowTemplates(false);
    toast.success(`Template "${template.name}" aplicado con éxito`, { icon: template.icon });
  };

  // Guardar versión actual
  const saveVersion = () => {
    const version = {
      id: Date.now(),
      name: `Versión ${savedVersions.length + 1}`,
      date: new Date().toISOString(),
      tables: JSON.parse(JSON.stringify(tables)),
      guests: JSON.parse(JSON.stringify(guests)),
      groups: JSON.parse(JSON.stringify(groups))
    };
    setSavedVersions([...savedVersions, version]);
    localStorage.setItem('wedding-versions', JSON.stringify([...savedVersions, version]));
    toast.success('Versión guardada', { icon: '💾' });
  };

  // Restaurar versión
  const restoreVersion = (version) => {
    setTables(version.tables);
    setGuests(version.guests);
    setGroups(version.groups);
    toast.success(`Versión "${version.name}" restaurada`, { icon: '⏪' });
  };

  // Calcular necesidades de presupuesto
  const calculateBudgetNeeds = () => {
    const totalGuests = guests.length;
    const totalTables = tables.length;

    return budgetItems.map(item => {
      let quantity = 0;
      if (item.item === 'Sillas') quantity = totalGuests;
      if (item.item === 'Manteles') quantity = totalTables;
      if (item.item === 'Centros de mesa') quantity = totalTables;
      if (item.item === 'Vajilla') quantity = totalGuests;

      return {
        ...item,
        quantity,
        total: quantity * item.unitPrice
      };
    });
  };

  // Detectar conflictos entre invitados
  const detectConflicts = () => {
    const detected = [];

    conflicts.forEach(conflict => {
      const guest1 = guests.find(g => g.id === conflict.guest1Id);
      const guest2 = guests.find(g => g.id === conflict.guest2Id);

      if (guest1 && guest2 && guest1.tableId && guest1.tableId === guest2.tableId) {
        detected.push({
          guest1: guest1.name,
          guest2: guest2.name,
          table: tables.find(t => t.id === guest1.tableId)?.name
        });
      }
    });

    return detected;
  };

  // Generar código QR para compartir
  const generateShareCode = () => {
    const data = { tables, guests, groups };
    const encoded = btoa(JSON.stringify(data));
    return encoded.substring(0, 8).toUpperCase();
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
        className="absolute select-none cursor-move"
        style={{
          left: table.x,
          top: table.y,
          transition: isDraggingTable ? 'none' : 'all 0.3s ease'
        }}
        onMouseDown={(e) => handleMouseDownTable(e, table.id)}
        onTouchStart={(e) => handleTouchStartTable(e, table.id)}
        onContextMenu={handleContextMenu}
      >
        {/* Contenedor mesa */}
        <div
          className={`relative ${isRound ? 'rounded-full' : 'rounded-2xl'}
                      bg-gradient-to-br from-white to-violet-50 shadow-xl border-3 border-violet-300
                      hover:scale-105 hover:shadow-violet-300/40 flex items-center justify-center table-container
                      backdrop-blur-sm bg-opacity-95 active:scale-95 touch-manipulation
                      ${longPressActive ? 'animate-pulse scale-105' : ''}`}
          style={{
            width: isRound ? tableSize : rectWidth,
            height: isRound ? tableSize : rectHeight,
            minHeight: isRound ? tableSize : rectHeight,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            WebkitTapHighlightColor: 'transparent'
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
            const guestGroupColor = guest ? getGroupColor(guest.group || 'other') : null;
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
                onMouseEnter={(e) => {
                  if (guest) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredSeat({
                      guest,
                      x: rect.left + rect.width / 2,
                      y: rect.top - 10
                    });
                  }
                }}
                onMouseLeave={() => setHoveredSeat(null)}
                draggable={!!guest}
                onDragStart={(e) => guest && handleDragStart(e, guest)}
                onTouchStart={(e) => {
                  if (!guest) return;
                  e.stopPropagation();
                  setLongPressActive(true);
                  const touch = e.touches[0];

                  longPressTimer.current = setTimeout(() => {
                    setLongPressActive(false);
                    if (navigator.vibrate) navigator.vibrate(30);
                    setDraggedGuest(guest);
                    setIsDragging(true);
                    setDragPos({ x: touch.clientX, y: touch.clientY });
                    assignGuestToSeat(guest.id, null, null);
                  }, 300);
                }}
                onTouchMove={(e) => {
                  // Si se mueve antes de activar, cancelar
                  if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                    setLongPressActive(false);
                  }
                }}
                onTouchEnd={() => {
                  setLongPressActive(false);
                  if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                  }
                }}
                className={`seat absolute w-10 h-10 rounded-full border-3 flex items-center justify-center text-xs cursor-pointer group shadow-md active:scale-90 touch-manipulation
                  ${guest
                    ? 'text-white hover:shadow-lg hover:scale-110'
                    : 'bg-white border-violet-300 hover:border-violet-500 hover:bg-violet-50 hover:scale-105'
                  }
                  ${guest && highlightedGuests.includes(guest.id) ? 'ring-4 ring-yellow-400 ring-offset-2 scale-125 z-10' : ''}
                  ${guest && highlightedGuests.length > 0 && !highlightedGuests.includes(guest.id) ? 'opacity-30' : ''}`}
                style={{
                  left: seatX,
                  top: seatY,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  WebkitTapHighlightColor: 'transparent',
                  ...(guest && guestGroupColor && {
                    backgroundColor: guestGroupColor,
                    borderColor: guestGroupColor,
                    boxShadow: highlightedGuests.includes(guest.id)
                      ? `0 8px 24px ${guestGroupColor}80, 0 0 0 4px rgba(250, 204, 21, 0.3)`
                      : `0 4px 12px ${guestGroupColor}40`
                  })
                }}
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
        {/* Header minimalista y elegante - Fijo */}
        <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-40">
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

        {/* Toolbar profesional - Fijo - Solo desktop */}
        <div className={`fixed top-16 md:top-20 left-4 z-30 py-2 animate-fadeIn hidden lg:block transition-all duration-300 ${
          sidebarCollapsed ? 'right-4' : 'right-[420px]'
        }`}>
          <div className="max-w-full">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-4">
                {/* SECCIÓN IZQUIERDA: Crear elementos */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddTable(true)}
                    className="bg-[#a8b5a1] hover:bg-[#8b9e8a] text-white px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md flex items-center gap-2 text-sm font-medium transition-all"
                  >
                    <Plus size={18} />
                    <span>Mesa</span>
                  </button>
                  <button
                    onClick={() => setShowAddGuests(true)}
                    className="bg-[#7fa99b] hover:bg-[#6b8f82] text-white px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md flex items-center gap-2 text-sm font-medium transition-all"
                  >
                    <UserPlus size={18} />
                    <span>Invitados</span>
                  </button>
                  <button
                    onClick={() => setShowManageGroups(true)}
                    className="bg-[#c9b8a8] hover:bg-[#b5a598] text-white px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md flex items-center gap-2 text-sm font-medium transition-all"
                  >
                    <Tag size={18} />
                    <span>Grupos</span>
                  </button>
                </div>

                {/* SECCIÓN CENTRO: Búsqueda */}
                <div className="flex-1 max-w-sm">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Buscar invitado en mesas..."
                      value={searchQuery}
                      onChange={(e) => searchGuestInCanvas(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 text-sm focus:border-[#a8b5a1] focus:ring-2 focus:ring-[#a8b5a1]/20 transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setHighlightedGuests([]);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* SECCIÓN DERECHA: Menús y herramientas */}
                <div className="flex items-center gap-2">
                  {/* Menú Acciones */}
                  <div className="relative" ref={actionsMenuRef}>
                    <button
                      onClick={() => setShowActionsMenu(!showActionsMenu)}
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md flex items-center gap-2 text-sm font-medium transition-all"
                    >
                      <Wand2 size={18} />
                      <span>Acciones</span>
                      <ChevronDown size={16} className={`transition-transform ${showActionsMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showActionsMenu && (
                      <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
                        <button
                          onClick={() => {
                            autoAssignSeats();
                            setShowActionsMenu(false);
                          }}
                          className="w-full px-4 py-3 hover:bg-purple-50 flex items-center gap-3 text-left transition-colors"
                        >
                          <Wand2 size={18} className="text-purple-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Auto-Asignar</p>
                            <p className="text-xs text-gray-500">Por grupos</p>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            madnessMode();
                            setShowActionsMenu(false);
                          }}
                          className="w-full px-4 py-3 hover:bg-pink-50 flex items-center gap-3 text-left transition-colors border-t border-gray-100"
                        >
                          <Shuffle size={18} className="text-pink-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Madness</p>
                            <p className="text-xs text-gray-500">Aleatorio</p>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            clearAllAssignments();
                            setShowActionsMenu(false);
                          }}
                          className="w-full px-4 py-3 hover:bg-orange-50 flex items-center gap-3 text-left transition-colors border-t border-gray-100"
                        >
                          <X size={18} className="text-orange-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Limpiar Todo</p>
                            <p className="text-xs text-gray-500">Desasignar invitados</p>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Menú Exportar */}
                  <div className="relative" ref={exportMenuRef}>
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="bg-[#c9b8a8] hover:bg-[#b5a598] text-white px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md flex items-center gap-2 text-sm font-medium transition-all"
                    >
                      <Download size={18} />
                      <span>Exportar</span>
                      <ChevronDown size={16} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showExportMenu && (
                      <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
                        <button
                          onClick={() => {
                            exportPDF();
                            setShowExportMenu(false);
                          }}
                          className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-left transition-colors"
                        >
                          <Printer size={18} className="text-gray-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Exportar PDF</p>
                            <p className="text-xs text-gray-500">Disposición de mesas</p>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            exportGuestList();
                            setShowExportMenu(false);
                          }}
                          className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-left transition-colors border-t border-gray-100"
                        >
                          <FileSpreadsheet size={18} className="text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Exportar Excel</p>
                            <p className="text-xs text-gray-500">Lista de invitados</p>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            setShowImportGuests(true);
                            setShowExportMenu(false);
                          }}
                          className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-left transition-colors border-t border-gray-100"
                        >
                          <FileUp size={18} className="text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Importar Excel</p>
                            <p className="text-xs text-gray-500">Cargar invitados</p>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Filtro grupos */}
                  <div className="relative" ref={filterMenuRef}>
                    <button
                      onClick={() => {
                        if (activeGroupFilter && activeGroupFilter !== 'menu') {
                          setActiveGroupFilter(null);
                          setHighlightedGuests([]);
                          setSearchQuery('');
                        } else {
                          setActiveGroupFilter(activeGroupFilter === 'menu' ? null : 'menu');
                        }
                      }}
                      className={`px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md flex items-center gap-2 text-sm font-medium transition-all ${
                        activeGroupFilter && activeGroupFilter !== 'menu'
                          ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                      title="Filtrar por grupo"
                    >
                      <Filter size={18} />
                      {activeGroupFilter && activeGroupFilter !== 'menu' ? (
                        <X size={16} />
                      ) : (
                        <ChevronDown size={16} className={`transition-transform ${activeGroupFilter === 'menu' ? 'rotate-180' : ''}`} />
                      )}
                    </button>

                    {activeGroupFilter === 'menu' && (
                      <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50 max-h-80 overflow-y-auto">
                        {groups.map(group => (
                          <button
                            key={group.id}
                            onClick={() => toggleGroupFilter(group.id)}
                            className="w-full px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-left transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: group.color }}
                            ></div>
                            <span className="text-sm text-gray-900 flex-1">{group.name}</span>
                            <span className="text-xs text-gray-500">
                              {guests.filter(g => g.group === group.id && g.tableId !== null).length}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Deshacer/Rehacer */}
                  <button
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className="bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed text-gray-700 p-2.5 rounded-lg shadow-sm hover:shadow-md transition-all"
                    title="Deshacer"
                  >
                    <Undo2 size={18} />
                  </button>
                  <button
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className="bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed text-gray-700 p-2.5 rounded-lg shadow-sm hover:shadow-md transition-all"
                    title="Rehacer"
                  >
                    <Redo2 size={18} />
                  </button>

                  {/* Estadísticas */}
                  <button
                    onClick={() => setShowStats(true)}
                    className="bg-[#a8b5a1] hover:bg-[#8b9e8a] text-white px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md flex items-center gap-2 text-sm font-medium transition-all"
                  >
                    <BarChart3 size={18} />
                    <span>Estadísticas</span>
                  </button>

                  {/* Menú de Herramientas */}
                  <div className="relative" ref={toolsMenuRef}>
                    <button
                      onClick={() => setShowToolsMenu(!showToolsMenu)}
                      className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md flex items-center gap-2 text-sm font-medium transition-all"
                    >
                      <Settings size={18} />
                      <span>Herramientas</span>
                      <ChevronDown size={16} className={`transition-transform ${showToolsMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showToolsMenu && (
                      <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50 max-h-[500px] overflow-y-auto">
                        <button
                          onClick={() => {
                            setShowTemplates(true);
                            setShowToolsMenu(false);
                          }}
                          className="w-full px-4 py-3 hover:bg-purple-50 flex items-center gap-3 text-left transition-colors"
                        >
                          <Layout size={18} className="text-purple-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Templates</p>
                            <p className="text-xs text-gray-500">Plantillas de eventos</p>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            setShowTimeline(true);
                            setShowToolsMenu(false);
                          }}
                          className="w-full px-4 py-3 hover:bg-blue-50 flex items-center gap-3 text-left transition-colors border-t border-gray-100"
                        >
                          <Clock size={18} className="text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Cronograma</p>
                            <p className="text-xs text-gray-500">Timeline del evento</p>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            setShowChecklist(true);
                            setShowToolsMenu(false);
                          }}
                          className="w-full px-4 py-3 hover:bg-green-50 flex items-center gap-3 text-left transition-colors border-t border-gray-100"
                        >
                          <CheckSquare size={18} className="text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Checklist</p>
                            <p className="text-xs text-gray-500">Tareas pendientes</p>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            setShowBudget(true);
                            setShowToolsMenu(false);
                          }}
                          className="w-full px-4 py-3 hover:bg-amber-50 flex items-center gap-3 text-left transition-colors border-t border-gray-100"
                        >
                          <DollarSign size={18} className="text-amber-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Presupuesto</p>
                            <p className="text-xs text-gray-500">Costos estimados</p>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            setShowVersions(true);
                            setShowToolsMenu(false);
                          }}
                          className="w-full px-4 py-3 hover:bg-indigo-50 flex items-center gap-3 text-left transition-colors border-t border-gray-100"
                        >
                          <History size={18} className="text-indigo-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Versiones</p>
                            <p className="text-xs text-gray-500">Guardar y restaurar</p>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            setShowCollaboration(true);
                            setShowToolsMenu(false);
                          }}
                          className="w-full px-4 py-3 hover:bg-teal-50 flex items-center gap-3 text-left transition-colors border-t border-gray-100"
                        >
                          <Share2 size={18} className="text-teal-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Compartir</p>
                            <p className="text-xs text-gray-500">Colaboración</p>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            setShowAdvancedDashboard(true);
                            setShowToolsMenu(false);
                          }}
                          className="w-full px-4 py-3 hover:bg-pink-50 flex items-center gap-3 text-left transition-colors border-t border-gray-100"
                        >
                          <TrendingUp size={18} className="text-pink-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Dashboard Avanzado</p>
                            <p className="text-xs text-gray-500">Análisis detallado</p>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controles flotantes de zoom y sugerencias */}
        <div className="fixed bottom-8 right-8 z-30 flex flex-col gap-2">
          {/* Sugerencias */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSuggestions(true)}
            className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white p-4 rounded-full shadow-2xl flex items-center gap-2 font-medium transition-all group"
            title="Ver sugerencias"
          >
            <Lightbulb size={24} className="group-hover:rotate-12 transition-transform" />
            {generateSuggestions().length > 0 && (
              <span className="bg-white text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {generateSuggestions().length}
              </span>
            )}
          </motion.button>

          {/* Controles de zoom */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-2 flex flex-col gap-1">
            <button
              onClick={() => setZoomLevel(Math.min(zoomLevel + 10, 150))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Acercar"
            >
              <ZoomIn size={20} className="text-gray-700" />
            </button>
            <div className="text-center text-xs font-medium text-gray-600 py-1">
              {zoomLevel}%
            </div>
            <button
              onClick={() => setZoomLevel(Math.max(zoomLevel - 10, 50))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Alejar"
            >
              <ZoomOut size={20} className="text-gray-700" />
            </button>
            <div className="h-px bg-gray-200 my-1"></div>
            <button
              onClick={() => setZoomLevel(100)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Restablecer"
            >
              <Maximize2 size={18} className="text-gray-700" />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="relative p-4 md:p-8 lg:p-12 mt-16 md:mt-20 lg:mt-40 overflow-auto"
          style={{
            minWidth: '2000px',
            minHeight: '1500px',
            WebkitOverflowScrolling: 'touch',
            touchAction: isDraggingTable || isDragging ? 'none' : 'pan-x pan-y',
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top left'
          }}
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

      {/* Panel lateral - Desktop - Colapsable */}
      <div className={`hidden lg:flex bg-gradient-to-b from-gray-50 to-white border-l border-gray-200 flex-col shadow-xl z-20 relative transition-all duration-300 ${
        sidebarCollapsed ? 'w-0 opacity-0' : 'w-96 opacity-100'
      }`}>
        {!sidebarCollapsed && (
          <>
            <div className="p-6 border-b border-gray-200 bg-white relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
                  <Sparkles size={20} className="text-[#a8b5a1]" /> Estadísticas
                </h2>
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Cerrar panel"
                >
                  <ChevronRight size={20} className="text-gray-500" />
                </button>
              </div>
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
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-sm flex-shrink-0"
                    style={{ backgroundColor: groupColor }}
                  >
                    {guest.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-800 text-sm group-hover:text-gray-900 transition-colors flex-1">{guest.name}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingGuest({ ...guest });
                      }}
                      className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Editar invitado"
                    >
                      <Edit3 size={14} className="text-blue-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteGuest(guest.id);
                      }}
                      className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                      title="Eliminar invitado"
                    >
                      <Trash2 size={14} className="text-red-600" />
                    </button>
                  </div>
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
          </>
        )}
      </div>

      {/* Botón para abrir sidebar cuando está colapsado */}
      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="hidden lg:block fixed top-1/2 right-4 -translate-y-1/2 z-30 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-[#a8b5a1] p-3 rounded-l-xl shadow-lg transition-all group"
          title="Abrir panel de invitados"
        >
          <div className="flex items-center gap-2">
            <Users size={20} className="text-gray-600 group-hover:text-[#a8b5a1] transition-colors" />
            <ChevronRight size={20} className="text-gray-400 rotate-180" />
          </div>
        </button>
      )}

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

      {/* Modal editar invitado */}
      {editingGuest && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 animate-fadeIn">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 shadow-2xl w-[480px] border border-gray-200"
          >
            <h3 className="text-2xl font-semibold mb-6 text-gray-900 flex items-center gap-2">
              <Edit3 className="text-[#7fa99b]" size={28} />
              Editar Invitado
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre completo</label>
                <input
                  type="text"
                  placeholder="Nombre del invitado"
                  value={editingGuest.name}
                  onChange={(e) => setEditingGuest({ ...editingGuest, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:border-[#a8b5a1] focus:ring-1 focus:ring-[#a8b5a1] transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grupo</label>
                <select
                  value={editingGuest.group}
                  onChange={(e) => setEditingGuest({ ...editingGuest, group: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:border-[#a8b5a1] focus:ring-1 focus:ring-[#a8b5a1] transition-colors"
                >
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              {editingGuest.tableId !== null && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700 flex items-center gap-2">
                    <span>ℹ️</span>
                    <span>Este invitado está asignado a una mesa</span>
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingGuest(null)}
                className="flex-1 px-5 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveEditedGuest}
                className="flex-1 px-5 py-3 rounded-lg bg-[#7fa99b] hover:bg-[#6b8f82] text-white font-medium shadow-sm transition-all"
              >
                Guardar Cambios
              </button>
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
                        e.stopPropagation();
                        setLongPressActive(true);
                        const touch = e.touches[0];

                        longPressTimer.current = setTimeout(() => {
                          setLongPressActive(false);
                          if (navigator.vibrate) navigator.vibrate(30);
                          setDraggedGuest(guest);
                          setIsDragging(true);
                          setDragPos({ x: touch.clientX, y: touch.clientY });
                        }, 300);
                      }}
                      onTouchMove={(e) => {
                        // Si se mueve antes de activar, cancelar
                        if (longPressTimer.current) {
                          clearTimeout(longPressTimer.current);
                          longPressTimer.current = null;
                          setLongPressActive(false);
                        }
                      }}
                      onTouchEnd={() => {
                        setLongPressActive(false);
                        if (longPressTimer.current) {
                          clearTimeout(longPressTimer.current);
                          longPressTimer.current = null;
                        }
                      }}
                      className="bg-gray-50 p-3 rounded-lg border border-gray-200 cursor-move active:scale-95 active:opacity-70 transition-all duration-150 touch-manipulation"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
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

      {/* Tooltip global para invitados */}
      {hoveredSeat && (
        <div
          className="fixed pointer-events-none z-[9999]"
          style={{
            left: hoveredSeat.x,
            top: hoveredSeat.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
            {hoveredSeat.guest.name}
          </div>
        </div>
      )}

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

      {/* Modal de estadísticas avanzadas */}
      {showStats && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 animate-fadeIn">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 shadow-2xl w-[700px] max-h-[85vh] overflow-hidden flex flex-col border border-gray-200"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="text-[#a8b5a1]" size={28} />
                Estadísticas Detalladas
              </h3>
              <button
                onClick={() => setShowStats(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Resumen general */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                  <p className="text-sm text-purple-700 font-medium mb-1">Total Invitados</p>
                  <p className="text-3xl font-bold text-purple-900">{guests.length}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                  <p className="text-sm text-green-700 font-medium mb-1">Asignados</p>
                  <p className="text-3xl font-bold text-green-900">{assignedGuests.length}</p>
                  <p className="text-xs text-green-600 mt-1">{guests.length > 0 ? Math.round((assignedGuests.length / guests.length) * 100) : 0}% del total</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
                  <p className="text-sm text-orange-700 font-medium mb-1">Sin Asignar</p>
                  <p className="text-3xl font-bold text-orange-900">{unassignedGuests.length}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                  <p className="text-sm text-blue-700 font-medium mb-1">Total Mesas</p>
                  <p className="text-3xl font-bold text-blue-900">{tables.length}</p>
                </div>
              </div>

              {/* Distribución por grupo */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Tag size={18} />
                  Distribución por Grupo
                </h4>
                <div className="space-y-2">
                  {groups.map(group => {
                    const groupGuests = guests.filter(g => g.group === group.id);
                    const groupAssigned = groupGuests.filter(g => g.tableId !== null).length;
                    const percentage = groupGuests.length > 0 ? (groupAssigned / groupGuests.length) * 100 : 0;

                    return (
                      <div key={group.id} className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: group.color }}
                        ></div>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700">{group.name}</span>
                            <span className="text-gray-600">{groupAssigned}/{groupGuests.length}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: group.color
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ocupación de mesas */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3">Ocupación de Mesas</h4>
                <div className="space-y-2">
                  {tables.map(table => {
                    const tableGuests = guests.filter(g => g.tableId === table.id);
                    const occupancy = (tableGuests.length / table.capacity) * 100;
                    const colorClass = occupancy === 100 ? 'bg-green-500' : occupancy >= 75 ? 'bg-yellow-500' : 'bg-orange-500';

                    return (
                      <div key={table.id} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700 w-32 truncate">{table.name}</span>
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${colorClass}`}
                              style={{ width: `${occupancy}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="text-sm text-gray-600 w-16 text-right">
                          {tableGuests.length}/{table.capacity}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Capacidad total */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-200">
                <h4 className="font-semibold text-indigo-900 mb-2">Capacidad Total</h4>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-700">Asientos disponibles:</span>
                  <span className="text-2xl font-bold text-indigo-900">
                    {tables.reduce((sum, t) => sum + t.capacity, 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-indigo-700">Asientos libres:</span>
                  <span className="text-lg font-semibold text-indigo-800">
                    {tables.reduce((sum, t) => sum + t.capacity, 0) - assignedGuests.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowStats(false)}
                className="w-full px-5 py-3 rounded-lg bg-[#a8b5a1] hover:bg-[#8b9e8a] text-white font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Sugerencias Inteligentes */}
      {showSuggestions && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 animate-fadeIn">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-8 shadow-2xl w-[600px] max-h-[85vh] overflow-hidden flex flex-col border-2 border-yellow-300"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <Lightbulb className="text-yellow-500" size={32} />
                Sugerencias Inteligentes
              </h3>
              <button
                onClick={() => setShowSuggestions(false)}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {generateSuggestions().length === 0 ? (
                <div className="text-center py-12">
                  <Gift size={64} className="mx-auto text-green-400 mb-4" />
                  <p className="text-lg font-medium text-gray-700">¡Todo perfecto!</p>
                  <p className="text-sm text-gray-500 mt-2">No hay sugerencias por ahora. 🎉</p>
                </div>
              ) : (
                generateSuggestions().map((suggestion, index) => {
                  const bgColors = {
                    warning: 'bg-orange-100 border-orange-300',
                    info: 'bg-blue-100 border-blue-300',
                    tip: 'bg-purple-100 border-purple-300',
                    success: 'bg-green-100 border-green-300'
                  };

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-xl border-2 ${bgColors[suggestion.type]} backdrop-blur-sm`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">{suggestion.icon}</span>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{suggestion.title}</h4>
                          <p className="text-sm text-gray-700">{suggestion.description}</p>
                          {suggestion.action && (
                            <button
                              onClick={() => {
                                suggestion.action();
                                setShowSuggestions(false);
                              }}
                              className="mt-3 px-4 py-2 bg-white hover:bg-gray-50 text-gray-900 rounded-lg text-sm font-medium transition-colors shadow-sm"
                            >
                              {suggestion.actionText}
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-yellow-200">
              <button
                onClick={() => setShowSuggestions(false)}
                className="w-full px-5 py-3 rounded-lg bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white font-medium transition-colors shadow-md"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Templates de Eventos */}
      {showTemplates && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 animate-fadeIn">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 shadow-2xl w-[700px] max-h-[85vh] overflow-hidden flex flex-col border-2 border-purple-300"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <Layout className="text-purple-500" size={32} />
                Templates de Eventos
              </h3>
              <button
                onClick={() => setShowTemplates(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {EVENT_TEMPLATES.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200 hover:border-purple-400 transition-colors cursor-pointer"
                  onClick={() => {
                    if (confirm(`¿Aplicar template "${template.name}"? Esto reemplazará las mesas y grupos actuales.`)) {
                      applyTemplate(template);
                    }
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-5xl">{template.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-gray-900 mb-1">{template.name}</h4>
                      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>🧮 {template.tables.length} mesas</span>
                        <span>🏷️ {template.groups.length} grupos</span>
                      </div>
                    </div>
                    <ChevronRight className="text-purple-400" size={24} />
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowTemplates(false)}
                className="w-full px-5 py-3 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Timeline/Cronograma */}
      {showTimeline && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 animate-fadeIn">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 shadow-2xl w-[700px] max-h-[85vh] overflow-hidden flex flex-col border-2 border-blue-300"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="text-blue-500" size={32} />
                Cronograma del Evento
              </h3>
              <button
                onClick={() => setShowTimeline(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {timeline.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200 relative group"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-500 text-white rounded-lg px-3 py-2 font-bold text-sm">
                      {event.time}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{event.name}</h4>
                      <p className="text-sm text-gray-600">Duración: {event.duration} min</p>
                    </div>
                    <button
                      onClick={() => {
                        setTimeline(timeline.filter(e => e.id !== event.id));
                        toast.success('Evento eliminado del cronograma');
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-100 rounded-lg transition-all"
                      title="Eliminar evento"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>
                  {/* Barra de progreso visual */}
                  <div className="mt-3 bg-blue-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full"
                      style={{ width: `${Math.min((event.duration / 120) * 100, 100)}%` }}
                    ></div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Añadir nuevo evento */}
            <div className="mt-4 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
              <button
                onClick={() => {
                  const newEvent = {
                    id: Date.now(),
                    name: 'Nuevo Evento',
                    time: '00:00',
                    duration: 30
                  };
                  setTimeline([...timeline, newEvent]);
                  toast.success('Evento añadido al cronograma');
                }}
                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Añadir Evento
              </button>
              <p className="text-xs text-blue-600 mt-2 text-center">
                Tip: Puedes editar los valores manualmente en el código o implementar formularios de edición
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowTimeline(false)}
                className="w-full px-5 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Checklist de Planificación */}
      {showChecklist && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 animate-fadeIn">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 shadow-2xl w-[700px] max-h-[85vh] overflow-hidden flex flex-col border-2 border-green-300"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <CheckSquare className="text-green-500" size={32} />
                Checklist de Planificación
              </h3>
              <button
                onClick={() => setShowChecklist(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Progreso general */}
            <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-900">Progreso Total</span>
                <span className="font-bold text-green-600">
                  {Math.round((checklist.filter(c => c.completed).length / checklist.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(checklist.filter(c => c.completed).length / checklist.length) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {checklist.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`rounded-xl p-4 border-2 transition-all group ${
                    item.completed
                      ? 'bg-green-50 border-green-300'
                      : 'bg-gray-50 border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => {
                        setChecklist(checklist.map(c =>
                          c.id === item.id ? { ...c, completed: !c.completed } : c
                        ));
                      }}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer ${
                        item.completed
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {item.completed && <CheckSquare className="text-white" size={18} />}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-medium ${
                        item.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                      }`}>
                        {item.task}
                      </h4>
                      <p className="text-xs text-gray-500">{item.category}</p>
                    </div>
                    <button
                      onClick={() => {
                        setChecklist(checklist.filter(c => c.id !== item.id));
                        toast.success('Tarea eliminada');
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-100 rounded-lg transition-all"
                      title="Eliminar tarea"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Añadir nueva tarea */}
            <div className="mt-4 p-4 bg-green-50 rounded-xl border-2 border-green-200">
              <button
                onClick={() => {
                  const newTask = {
                    id: Date.now(),
                    task: 'Nueva tarea',
                    completed: false,
                    category: 'General'
                  };
                  setChecklist([...checklist, newTask]);
                  toast.success('Tarea añadida al checklist');
                }}
                className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Añadir Tarea
              </button>
              <p className="text-xs text-green-600 mt-2 text-center">
                Haz clic para marcar como completada • Elimina con el botón de borrar
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowChecklist(false)}
                className="w-full px-5 py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Presupuesto */}
      {showBudget && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 animate-fadeIn">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 shadow-2xl w-[700px] max-h-[85vh] overflow-hidden flex flex-col border-2 border-amber-300"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="text-amber-500" size={32} />
                Presupuesto y Necesidades
              </h3>
              <button
                onClick={() => setShowBudget(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Total presupuesto */}
            <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border-2 border-amber-300">
              <h4 className="text-sm text-amber-700 mb-2 font-medium">Presupuesto Estimado Total</h4>
              <p className="text-4xl font-bold text-amber-900">
                ${calculateBudgetNeeds().reduce((sum, item) => sum + item.total, 0).toLocaleString()}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {calculateBudgetNeeds().map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="text-amber-500" size={20} />
                      <div>
                        <h4 className="font-semibold text-gray-900">{item.item}</h4>
                        <p className="text-xs text-gray-500">{item.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-gray-900">${item.total.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{item.quantity} × ${item.unitPrice}</p>
                    </div>
                  </div>
                  <div className="bg-amber-100 rounded-lg px-3 py-1 text-xs text-amber-800 inline-block">
                    Cantidad: {item.quantity}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowBudget(false)}
                className="w-full px-5 py-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Versiones */}
      {showVersions && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 animate-fadeIn">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 shadow-2xl w-[700px] max-h-[85vh] overflow-hidden flex flex-col border-2 border-indigo-300"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <History className="text-indigo-500" size={32} />
                Versiones Guardadas
              </h3>
              <button
                onClick={() => setShowVersions(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <button
              onClick={saveVersion}
              className="mb-6 w-full px-5 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Save size={20} />
              Guardar Versión Actual
            </button>

            <div className="flex-1 overflow-y-auto space-y-3">
              {savedVersions.length === 0 ? (
                <div className="text-center py-12">
                  <Layers size={64} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No hay versiones guardadas</p>
                </div>
              ) : (
                savedVersions.map((version, index) => (
                  <motion.div
                    key={version.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-200 hover:border-indigo-400 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{version.name}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(version.date).toLocaleString('es-ES')}
                        </p>
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          <span>🧮 {version.tables.length} mesas</span>
                          <span>👥 {version.guests.length} invitados</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`¿Restaurar "${version.name}"?`)) {
                            restoreVersion(version);
                            setShowVersions(false);
                          }
                        }}
                        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Restaurar
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowVersions(false)}
                className="w-full px-5 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Dashboard Avanzado */}
      {showAdvancedDashboard && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 animate-fadeIn">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 shadow-2xl w-[900px] max-h-[90vh] overflow-hidden flex flex-col border-2 border-pink-300"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="text-pink-500" size={32} />
                Dashboard de Análisis Avanzado
              </h3>
              <button
                onClick={() => setShowAdvancedDashboard(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Métricas principales */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border-2 border-purple-200">
                  <Award className="text-purple-500 mb-2" size={24} />
                  <p className="text-sm text-purple-700 font-medium">Completado</p>
                  <p className="text-3xl font-bold text-purple-900">
                    {Math.round((assignedGuests.length / Math.max(guests.length, 1)) * 100)}%
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border-2 border-blue-200">
                  <Users className="text-blue-500 mb-2" size={24} />
                  <p className="text-sm text-blue-700 font-medium">Densidad Media</p>
                  <p className="text-3xl font-bold text-blue-900">
                    {tables.length > 0 ? Math.round(guests.length / tables.length) : 0}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border-2 border-green-200">
                  <Zap className="text-green-500 mb-2" size={24} />
                  <p className="text-sm text-green-700 font-medium">Eficiencia</p>
                  <p className="text-3xl font-bold text-green-900">
                    {tables.reduce((sum, t) => sum + t.capacity, 0) > 0
                      ? Math.round((assignedGuests.length / tables.reduce((sum, t) => sum + t.capacity, 0)) * 100)
                      : 0}%
                  </p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border-2 border-amber-200">
                  <Tag className="text-amber-500 mb-2" size={24} />
                  <p className="text-sm text-amber-700 font-medium">Grupos Activos</p>
                  <p className="text-3xl font-bold text-amber-900">{groups.length}</p>
                </div>
              </div>

              {/* Gráfica de distribución por grupo */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 size={20} className="text-indigo-500" />
                  Distribución por Grupo
                </h4>
                <div className="space-y-3">
                  {groups.map(group => {
                    const groupGuests = guests.filter(g => g.group === group.id);
                    const percentage = guests.length > 0 ? (groupGuests.length / guests.length) * 100 : 0;
                    return (
                      <div key={group.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: group.color }}
                            ></div>
                            <span className="font-medium text-gray-900">{group.name}</span>
                          </div>
                          <span className="text-gray-600">
                            {groupGuests.length} ({Math.round(percentage)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: group.color
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Análisis de diversidad social */}
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-6 border-2 border-teal-200">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="text-teal-500" size={20} />
                  Diversidad Social por Mesa
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {tables.map(table => {
                    const tableGuests = guests.filter(g => g.tableId === table.id);
                    const uniqueGroups = new Set(tableGuests.map(g => g.group)).size;
                    const diversityScore = tableGuests.length > 0 ? (uniqueGroups / groups.length) * 100 : 0;
                    const colorClass = diversityScore > 50 ? 'text-green-600' : diversityScore > 25 ? 'text-yellow-600' : 'text-gray-600';

                    return (
                      <div key={table.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-teal-100">
                        <div className="flex-1">
                          <span className="font-medium text-gray-900">{table.name}</span>
                          <div className="flex gap-1 mt-1">
                            {[...new Set(tableGuests.map(g => g.group))].map(groupId => {
                              const group = groups.find(gr => gr.id === groupId);
                              return (
                                <div
                                  key={groupId}
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: group?.color }}
                                  title={group?.name}
                                ></div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${colorClass}`}>
                            {Math.round(diversityScore)}%
                          </p>
                          <p className="text-xs text-gray-500">
                            {uniqueGroups}/{groups.length} grupos
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Predicción de interacción */}
              <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-6 border-2 border-rose-200">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Heart className="text-rose-500" size={20} />
                  Predicción de Interacción
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-rose-100">
                    <p className="text-sm text-gray-600 mb-1">Alta Compatibilidad</p>
                    <p className="text-2xl font-bold text-green-600">
                      {tables.filter(t => {
                        const tg = guests.filter(g => g.tableId === t.id);
                        const ug = new Set(tg.map(g => g.group)).size;
                        return ug >= 2 && tg.length >= t.capacity * 0.7;
                      }).length}
                    </p>
                    <p className="text-xs text-gray-500">mesas</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-rose-100">
                    <p className="text-sm text-gray-600 mb-1">Media</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {tables.filter(t => {
                        const tg = guests.filter(g => g.tableId === t.id);
                        const ug = new Set(tg.map(g => g.group)).size;
                        return ug === 1 || (tg.length > 0 && tg.length < t.capacity * 0.7);
                      }).length}
                    </p>
                    <p className="text-xs text-gray-500">mesas</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-rose-100">
                    <p className="text-sm text-gray-600 mb-1">Requiere Atención</p>
                    <p className="text-2xl font-bold text-red-600">
                      {tables.filter(t => guests.filter(g => g.tableId === t.id).length === 0).length}
                    </p>
                    <p className="text-xs text-gray-500">mesas vacías</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowAdvancedDashboard(false)}
                className="w-full px-5 py-3 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Colaboración */}
      {showCollaboration && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 animate-fadeIn">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 shadow-2xl w-[600px] max-h-[85vh] overflow-hidden flex flex-col border-2 border-teal-300"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <Share2 className="text-teal-500" size={32} />
                Compartir Planificación
              </h3>
              <button
                onClick={() => setShowCollaboration(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Código de compartir */}
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-6 border-2 border-teal-200">
                <div className="flex items-center gap-2 mb-3">
                  <QrCode className="text-teal-500" size={24} />
                  <h4 className="font-semibold text-gray-900">Código de Acceso</h4>
                </div>
                <div className="bg-white rounded-lg p-4 border-2 border-teal-300">
                  <p className="text-center text-3xl font-mono font-bold text-teal-900 tracking-wider">
                    {generateShareCode()}
                  </p>
                </div>
                <p className="text-xs text-gray-600 mt-3 text-center">
                  Comparte este código para que otros puedan ver tu planificación
                </p>
              </div>

              {/* Estadísticas de colaboración */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="text-gray-500" size={20} />
                  <h4 className="font-semibold text-gray-900">Actividad Reciente</h4>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>📅 Última actualización: {new Date().toLocaleString('es-ES')}</p>
                  <p>💾 Último guardado: Hace unos momentos</p>
                  <p>👥 Cambios pendientes: 0</p>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generateShareCode());
                    toast.success('Código copiado al portapapeles', { icon: '📋' });
                  }}
                  className="flex-1 px-4 py-3 bg-teal-100 hover:bg-teal-200 text-teal-900 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Copy size={18} />
                  Copiar Código
                </button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowCollaboration(false)}
                className="w-full px-5 py-3 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-medium transition-colors"
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

      {/* Footer elegante y fino */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-200 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4 text-gray-600">
              <span className="flex items-center gap-1.5">
                <Heart size={14} className="text-rose-400 fill-rose-400" />
                <span>Wedding Seating Planner</span>
              </span>
              <span className="hidden md:inline text-gray-400">|</span>
              <span className="hidden md:inline">v1.0.0</span>
            </div>
            <div className="flex items-center gap-4 text-gray-500">
              <span className="hidden sm:inline">© 2025 Jose Luis Caceres</span>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#a8b5a1] transition-colors"
              >
                Todos los derechos reservados
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WeddingSeatingApp;
