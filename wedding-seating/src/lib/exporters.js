import { contentBounds, tableShape } from './geometry';
import { tone } from './colors';
import { formatDate, initials, normalize, slug } from './text';

const INK = [30, 26, 22];
const INK_2 = [91, 84, 76];
const INK_3 = [142, 134, 123];
const GOLD = [169, 131, 74];
const LINE = [214, 203, 184];
const PAPER = [250, 246, 239];

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const tableGuests = (doc, tableId) =>
  doc.guests.filter((g) => g.tableId === tableId).sort((a, b) => a.seat - b.seat);

const download = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const baseName = (doc) => `plano-${slug(doc.event.title)}`;

export async function buildPDF(doc) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  const groupColor = new Map(doc.groups.map((g) => [g.id, g.color]));
  const subtitle = [formatDate(doc.event.date), doc.event.venue].filter(Boolean).join('  ·  ');

  const paper = () => {
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();
    pdf.setFillColor(...PAPER);
    pdf.rect(0, 0, w, h, 'F');
    return { w, h };
  };

  const heading = (w, title, kicker) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...GOLD);
    const k = kicker.toUpperCase();
    // jsPDF no tiene en cuenta charSpace al centrar: lo calculamos a mano.
    pdf.text(k, w / 2 - (pdf.getTextWidth(k) + 1.2 * (k.length - 1)) / 2, 14, { charSpace: 1.2 });
    pdf.setFont('times', 'italic');
    pdf.setFontSize(24);
    pdf.setTextColor(...INK);
    pdf.text(title, w / 2, 24, { align: 'center' });
    if (subtitle) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...INK_3);
      pdf.text(subtitle, w / 2, 30.5, { align: 'center' });
    }
    pdf.setDrawColor(...GOLD);
    pdf.setLineWidth(0.25);
    pdf.line(w / 2 - 12, 34, w / 2 + 12, 34);
  };

  // --- Página 1: el plano dibujado en vectorial ---
  {
    const { w, h } = paper();
    heading(w, doc.event.title || 'Plano de mesas', 'Plano de mesas');
    const bounds = contentBounds(doc.tables);
    if (bounds) {
      const area = { x: 14, y: 42, w: w - 28, h: h - 54 };
      const k = Math.min(area.w / (bounds.x1 - bounds.x0), area.h / (bounds.y1 - bounds.y0), 0.5);
      const ox = area.x + (area.w - (bounds.x1 - bounds.x0) * k) / 2 - bounds.x0 * k;
      const oy = area.y + (area.h - (bounds.y1 - bounds.y0) * k) / 2 - bounds.y0 * k;
      const X = (v) => ox + v * k;
      const Y = (v) => oy + v * k;
      for (const t of doc.tables) {
        const shape = tableShape(t);
        const seated = new Map(tableGuests(doc, t.id).map((g) => [g.seat, g]));
        pdf.setFillColor(255, 253, 249);
        pdf.setDrawColor(...LINE);
        pdf.setLineWidth(0.3);
        if (t.shape === 'rect') pdf.roundedRect(X(t.x - shape.width / 2), Y(t.y - shape.height / 2), shape.width * k, shape.height * k, 1.5, 1.5, 'FD');
        else pdf.circle(X(t.x), Y(t.y), (shape.width / 2) * k, 'FD');
        pdf.setFont('times', 'italic');
        pdf.setFontSize(Math.max(6, 34 * k));
        pdf.setTextColor(...INK);
        pdf.text(t.name, X(t.x), Y(t.y) + 0.5, { align: 'center', maxWidth: shape.width * k - 2 });
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(Math.max(4.5, 18 * k));
        pdf.setTextColor(...INK_3);
        pdf.text(`${seated.size} / ${t.capacity}`, X(t.x), Y(t.y) + Math.max(2.5, (t.shape === 'rect' ? 18 : 30) * k), { align: 'center' });
        shape.seats.forEach((p, i) => {
          const g = seated.get(i);
          const r = 15 * k;
          if (g) {
            const tn = tone(groupColor.get(g.groupId));
            pdf.setFillColor(...rgb(tn.bg));
            pdf.setDrawColor(...rgb(tn.border));
            pdf.circle(X(t.x + p.x), Y(t.y + p.y), r, 'FD');
            pdf.setTextColor(...rgb(tn.fg));
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(Math.max(4, 22 * k));
            pdf.text(initials(g.name), X(t.x + p.x), Y(t.y + p.y) + r * 0.35, { align: 'center' });
          } else {
            pdf.setFillColor(255, 253, 249);
            pdf.setDrawColor(...LINE);
            pdf.circle(X(t.x + p.x), Y(t.y + p.y), r, 'FD');
          }
        });
      }
    }
  }

  // --- Páginas por mesa ---
  const listPage = (kicker) => {
    pdf.addPage('a4', 'portrait');
    const { w, h } = paper();
    heading(w, doc.event.title || 'Plano de mesas', kicker);
    return { w, h };
  };

  {
    let { w, h } = listPage('Comensales por mesa');
    const colW = (w - 28 - 8) / 2;
    let col = 0;
    let y = 44;
    const top = 44;
    for (const t of doc.tables) {
      const list = tableGuests(doc, t.id);
      const blockH = 12 + Math.max(1, list.length) * 5.2 + 6;
      if (y + blockH > h - 14) {
        if (col === 0) {
          col = 1;
          y = top;
        } else {
          ({ w, h } = listPage('Comensales por mesa'));
          col = 0;
          y = top;
        }
      }
      const x = 14 + col * (colW + 8);
      pdf.setFont('times', 'italic');
      pdf.setFontSize(14);
      pdf.setTextColor(...INK);
      pdf.text(t.name, x, y + 5);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...INK_3);
      pdf.text(`${list.length} / ${t.capacity}`, x + colW, y + 5, { align: 'right' });
      pdf.setDrawColor(...LINE);
      pdf.setLineWidth(0.2);
      pdf.line(x, y + 7.5, x + colW, y + 7.5);
      let gy = y + 13;
      pdf.setFontSize(9.5);
      if (!list.length) {
        pdf.setTextColor(...INK_3);
        pdf.text('Sin comensales todavía', x, gy);
        gy += 5.2;
      }
      for (const g of list) {
        pdf.setTextColor(...INK_3);
        pdf.text(String(g.seat + 1).padStart(2, ' '), x, gy);
        pdf.setTextColor(...INK_2);
        pdf.text(g.name, x + 7, gy, { maxWidth: colW - 40 });
        if (g.diet) {
          pdf.setTextColor(...GOLD);
          pdf.setFontSize(7.5);
          pdf.text(g.diet, x + colW, gy, { align: 'right', maxWidth: 32 });
          pdf.setFontSize(9.5);
        }
        gy += 5.2;
      }
      y = gy + 6;
    }
  }

  // --- Lista alfabética (para el seating chart de la entrada) ---
  {
    let { h } = listPage('Busca tu mesa');
    const sorted = [...doc.guests].sort((a, b) => normalize(a.name).localeCompare(normalize(b.name), 'es'));
    const tableName = new Map(doc.tables.map((t) => [t.id, t.name]));
    const colW = (pdf.internal.pageSize.getWidth() - 28 - 10) / 2;
    let col = 0;
    let y = 46;
    pdf.setFontSize(9.5);
    for (const g of sorted) {
      if (y > h - 14) {
        if (col === 0) {
          col = 1;
          y = 46;
        } else {
          ({ h } = listPage('Busca tu mesa'));
          col = 0;
          y = 46;
        }
      }
      const x = 14 + col * (colW + 10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...INK_2);
      pdf.text(g.name, x, y, { maxWidth: colW - 34 });
      pdf.setFont('times', 'italic');
      pdf.setTextColor(...(g.tableId != null ? INK : INK_3));
      const where = g.tableId != null ? tableName.get(g.tableId) : 'Sin mesa';
      pdf.text(where, x + colW, y, { align: 'right' });
      const whereW = pdf.getTextWidth(where);
      pdf.setFont('helvetica', 'normal');
      const nameW = Math.min(pdf.getTextWidth(g.name), colW - 34);
      pdf.setDrawColor(...LINE);
      pdf.setLineDashPattern([0.3, 0.8], 0);
      if (x + nameW + 2 < x + colW - whereW - 2) pdf.line(x + nameW + 2, y - 0.8, x + colW - whereW - 2, y - 0.8);
      pdf.setLineDashPattern([], 0);
      y += 6;
    }
  }

  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...INK_3);
    pdf.text(`${i} / ${pages}`, w / 2, h - 6, { align: 'center' });
  }
  return pdf;
}

export async function exportPDF(doc) {
  const pdf = await buildPDF(doc);
  pdf.save(`${baseName(doc)}.pdf`);
}

/** Tarjetas de sitio: 8 por A4 (2 × 4), con marcas de corte suaves. */
export async function buildPlaceCards(doc) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const tableById = new Map(doc.tables.map((t) => [t.id, t]));
  const order = new Map(doc.tables.map((t, i) => [t.id, i]));
  const guests = doc.guests.filter((g) => g.tableId != null && tableById.has(g.tableId)).sort((a, b) => order.get(a.tableId) - order.get(b.tableId) || a.seat - b.seat);
  const W = 210;
  const H = 297;
  const cw = 95;
  const ch = 66;
  const mx = (W - cw * 2) / 2;
  const my = (H - ch * 4) / 2;
  guests.forEach((g, i) => {
    const slot = i % 8;
    if (slot === 0) {
      if (i) pdf.addPage();
      pdf.setFillColor(...PAPER);
      pdf.rect(0, 0, W, H, 'F');
      pdf.setDrawColor(...LINE);
      pdf.setLineWidth(0.15);
      pdf.setLineDashPattern([1, 1.5], 0);
      for (let c = 0; c <= 2; c++) pdf.line(mx + c * cw, my - 4, mx + c * cw, my + ch * 4 + 4);
      for (let r = 0; r <= 4; r++) pdf.line(mx - 4, my + r * ch, mx + cw * 2 + 4, my + r * ch);
      pdf.setLineDashPattern([], 0);
    }
    const x = mx + (slot % 2) * cw;
    const y = my + Math.floor(slot / 2) * ch;
    pdf.setDrawColor(...GOLD);
    pdf.setLineWidth(0.25);
    pdf.line(x + cw / 2 - 8, y + 18, x + cw / 2 + 8, y + 18);
    pdf.setFont('times', 'italic');
    pdf.setTextColor(...INK);
    let size = 26;
    pdf.setFontSize(size);
    while (pdf.getTextWidth(g.name) > cw - 16 && size > 14) pdf.setFontSize(--size);
    pdf.text(g.name, x + cw / 2, y + ch / 2 + 3, { align: 'center' });
    const label = tableById.get(g.tableId).name.toUpperCase();
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...GOLD);
    pdf.text(label, x + cw / 2 - (pdf.getTextWidth(label) + 1 * (label.length - 1)) / 2, y + ch - 16, { charSpace: 1 });
  });
  if (!guests.length) {
    pdf.setFont('times', 'italic');
    pdf.setFontSize(18);
    pdf.text('Todavía no hay invitados sentados', W / 2, H / 2, { align: 'center' });
  }
  return pdf;
}

export async function exportPlaceCards(doc) {
  (await buildPlaceCards(doc)).save(`tarjetas-${slug(doc.event.title)}.pdf`);
}

export async function exportExcel(doc) {
  const XLSX = await import('xlsx');
  const tableById = new Map(doc.tables.map((t) => [t.id, t]));
  const groupById = new Map(doc.groups.map((g) => [g.id, g]));
  const wb = XLSX.utils.book_new();

  const guests = [...doc.guests]
    .sort((a, b) => normalize(a.name).localeCompare(normalize(b.name), 'es'))
    .map((g) => ({
      Nombre: g.name,
      Grupo: groupById.get(g.groupId)?.name ?? '',
      Mesa: tableById.get(g.tableId)?.name ?? 'Sin mesa',
      Asiento: g.seat != null ? g.seat + 1 : '',
      Asistencia: { yes: 'Confirmado', no: 'No asiste', pending: 'Pendiente' }[g.rsvp] ?? 'Pendiente',
      Dieta: g.diet,
      Notas: g.note,
    }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(guests), 'Invitados');

  const tables = doc.tables.map((t) => {
    const n = doc.guests.filter((g) => g.tableId === t.id).length;
    return { Mesa: t.name, Forma: t.shape === 'rect' ? 'Rectangular' : 'Redonda', Capacidad: t.capacity, Ocupados: n, Libres: t.capacity - n };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tables), 'Mesas');

  XLSX.writeFile(wb, `${baseName(doc)}.xlsx`);
}

export function exportBackup(doc) {
  download(new Blob([JSON.stringify({ app: 'wedding-seating-planner', ...doc }, null, 2)], { type: 'application/json' }), `${baseName(doc)}.json`);
}

export async function readBackup(file) {
  const data = JSON.parse(await file.text());
  if (!data || !Array.isArray(data.tables) || !Array.isArray(data.guests)) throw new Error('El archivo no es una copia de seguridad válida');
  return data;
}
