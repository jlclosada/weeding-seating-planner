import { expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { buildPDF, buildPlaceCards } from '../lib/exporters';
import { buildDemoDoc } from '../lib/demo';

it('genera el PDF de la boda de ejemplo', async () => {
  const pdf = await buildPDF(buildDemoDoc());
  expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(3);
  // PDF_OUT=ruta.pdf npm test → guarda el archivo para revisarlo a ojo.
  if (process.env.PDF_OUT) writeFileSync(process.env.PDF_OUT, Buffer.from(pdf.output('arraybuffer')));
});

it('genera las tarjetas de sitio', async () => {
  const doc = buildDemoDoc();
  const pdf = await buildPlaceCards(doc);
  const seated = doc.guests.filter((g) => g.tableId != null).length;
  expect(pdf.getNumberOfPages()).toBe(Math.ceil(seated / 8));
  if (process.env.CARDS_OUT) writeFileSync(process.env.CARDS_OUT, Buffer.from(pdf.output('arraybuffer')));
});
