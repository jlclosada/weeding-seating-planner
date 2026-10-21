import { useMemo } from 'react';
import { normalize } from '../lib/text';

export function useGuestFilter(doc, { query, groupFilter, scope }) {
  return useMemo(() => {
    const q = normalize(query);
    const tableName = new Map(doc.tables.map((t) => [t.id, t.name]));
    const base = doc.guests.filter((g) => (groupFilter ? (g.groupId ?? '__none__') === groupFilter : true));
    const visible = base.filter((g) => (q ? normalize(g.name).includes(q) : scope === 'all' || g.tableId == null));
    const sections = [];
    const byGroup = new Map();
    for (const g of visible) {
      const key = g.groupId ?? '__none__';
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key).push(g);
    }
    for (const group of [...doc.groups, { id: '__none__', name: 'Sin grupo', color: null }]) {
      const list = byGroup.get(group.id);
      if (list?.length) sections.push({ group, guests: list });
    }
    return { sections, count: visible.length, tableName };
  }, [doc.guests, doc.groups, doc.tables, query, groupFilter, scope]);
}
