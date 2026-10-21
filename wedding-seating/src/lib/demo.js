import { autoAssign } from './autoAssign';
import { layoutTables } from './geometry';
import { DEFAULT_GROUPS, TEMPLATES, createEmptyDoc, makeGuest, makeTable } from '../state/model';

const NAMES = {
  'family-bride': ['Elena Ruiz', 'Carmen Ruiz', 'Luis Ruiz', 'Rosa Ruiz', 'Tomás Ruiz', 'Pilar Navas', 'Antonio Navas', 'Mercedes Gil', 'Julián Gil', 'Inés Ruiz', 'Clara Mora', 'Ramón Mora', 'Teresa Mora'],
  'family-groom': ['Pablo Ortiz', 'Ana Ortiz', 'Jorge Ortiz', 'Beatriz Ortiz', 'Manuel Lara', 'Dolores Lara', 'Diego Lara', 'Sofía Lara', 'Ignacio Ortiz', 'Elvira Campos', 'Fernando Campos'],
  friends: ['Marta Gil', 'Íñigo Sanz', 'Lucía Prieto', 'Marcos León', 'Álvaro Paz', 'Irene Calvo', 'Bruno Esteve', 'Celia Ramos', 'Óscar Lago', 'Nuria Vela', 'Pablo Ferrer', 'Andrea Solís', 'Raúl Ibáñez', 'Laura Peña', 'Gonzalo Rey', 'Paula Montes'],
  work: ['Sara Vidal', 'Hugo Martín', 'Paula Rey', 'Iván Cruz', 'Natalia Bravo', 'Sergio Molina', 'Eva Duarte', 'Rubén Arias'],
  other: ['Nerea Soto', 'Javier Quintana', 'Alba Serrano', 'Héctor Blanco'],
};

const DIETS = { 'Rosa Ruiz': 'Vegana', 'Iván Cruz': 'Sin gluten', 'Sofía Lara': 'Menú infantil', 'Nuria Vela': 'Vegetariana', 'Héctor Blanco': 'Sin lactosa' };

export function buildDemoDoc() {
  const doc = createEmptyDoc();
  doc.event = { title: 'Elena & Pablo', date: '2027-06-14', venue: 'Finca El Olivar' };
  doc.groups = DEFAULT_GROUPS.map((g) => ({ ...g }));
  doc.tables = layoutTables(TEMPLATES[0].tables, { x: 600, y: 120 }).map((t) => makeTable(t));
  doc.guests = Object.entries(NAMES).flatMap(([groupId, names]) => names.map((n) => makeGuest(n, groupId, { diet: DIETS[n] ?? '' })));
  const marcos = doc.guests.find((g) => g.name === 'Marcos León');
  const lucia = doc.guests.find((g) => g.name === 'Lucía Prieto');
  doc.avoid = [[marcos.id, lucia.id]];

  // Sentamos a la mayoría para que el ejemplo se vea vivo, pero dejamos trabajo pendiente.
  const pendingNames = new Set(['Irene Calvo', 'Bruno Esteve', 'Celia Ramos', 'Óscar Lago', 'Paula Rey', 'Iván Cruz', 'Rosa Ruiz', 'Tomás Ruiz', 'Nerea Soto', 'Alba Serrano', 'Héctor Blanco', 'Javier Quintana']);
  const head = doc.tables[0];
  const headTable = ['Luis Ruiz', 'Carmen Ruiz', 'Elena Ruiz', 'Pablo Ortiz', 'Ana Ortiz', 'Jorge Ortiz', 'Inés Ruiz', 'Ignacio Ortiz'];
  doc.guests.forEach((g) => {
    const i = headTable.indexOf(g.name);
    if (i >= 0) Object.assign(g, { tableId: head.id, seat: i });
  });
  // Casi todos han confirmado; alguno sigue pendiente y otro no podrá venir.
  doc.guests.forEach((g) => {
    g.rsvp = ['Nerea Soto', 'Alba Serrano', 'Óscar Lago'].includes(g.name) ? 'pending' : g.name === 'Javier Quintana' ? 'no' : 'yes';
  });
  doc.tasks.slice(0, 4).forEach((t) => (t.done = true));
  doc.budgetCap = 22000;
  const toSeat = { ...doc, guests: doc.guests.filter((g) => !pendingNames.has(g.name)) };
  const { guests } = autoAssign(toSeat);
  const seated = new Map(guests.map((g) => [g.id, g]));
  doc.guests = doc.guests.map((g) => seated.get(g.id) ?? g);
  return doc;
}
