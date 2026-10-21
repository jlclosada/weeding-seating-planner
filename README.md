# Wedding Seating Planner

Planificador de mesas para bodas: diseña el salón, sienta a cada invitado y descarga un PDF listo para imprimir.

**Demo:** https://wedding-seating-plan.netlify.app/

## Qué hace

- **Plano interactivo**: mesas redondas o largas, arrastrar para moverlas, zoom con rueda/trackpad/pellizco y botón «Encajar».
- **Sentar invitados**: arrastra desde la lista a un asiento (o toca invitado → toca asiento en móvil). Soltar sobre un asiento ocupado intercambia a las dos personas.
- **Sentar automáticamente**: respeta a quien ya está sentado, mantiene juntos a los grupos, evita parejas marcadas como «no sentar juntos» y crea mesas si faltan asientos.
- **Deshacer / rehacer** para todo (⌘Z / ⇧⌘Z) y avisos con «Deshacer» en las acciones destructivas.
- **Invitados**: alta en bloque con detección de duplicados, importación de Excel/CSV (columnas opcionales Nombre, Grupo, Dieta), grupos con color, menús especiales y notas.
- **Resumen**: ocupación por mesa y grupo, avisos (incompatibilidades, grupos dispersos, mesas vacías) y recuento de menús para el catering.
- **Exportar**: PDF con el plano dibujado, comensales por mesa y lista alfabética «Busca tu mesa»; Excel; copia de seguridad `.json` restaurable.
- Todo se guarda en el navegador (`localStorage`). Los datos de la versión anterior se migran solos.

Atajos: `N` nueva mesa · `Supr` borrar mesa seleccionada · `F` encajar · `+`/`-` zoom · `Esc` cancelar.

## Desarrollo

```bash
cd wedding-seating
npm install
npm run dev      # http://localhost:5173
npm test         # vitest
npm run lint
npm run build
```

## Estructura

```
wedding-seating/src
├── App.jsx                 # orquestación: vistas, acciones, arrastre de invitados, atajos
├── state/
│   ├── model.js            # modelo de datos, plantillas, normalización/migración
│   ├── reducer.js          # reducer puro + historial (deshacer/rehacer)
│   ├── storage.js          # persistencia en localStorage
│   └── store.jsx           # contexto React y autoguardado
├── lib/
│   ├── geometry.js         # geometría de mesas, huecos libres, distribuciones
│   ├── autoAssign.js       # algoritmo de asignación y análisis de avisos
│   ├── importGuests.js     # CSV/Excel → invitados, duplicados
│   └── exporters.js        # PDF (jsPDF), Excel (SheetJS), copia JSON — carga diferida
├── components/             # TopBar, GuestPanel, Canvas, TableNode, Inspector, vistas y diálogos
└── __tests__/              # tests de reducer, migración, asignación, geometría, importación y PDF
```

© Jose Luis Caceres
