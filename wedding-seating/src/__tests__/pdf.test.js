import { expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { buildPDF } from '../lib/exporters';
import { buildDemoDoc } from '../lib/demo';

it('genera el PDF de la boda de ejemplo', async () => {
  const pdf = await buildPDF(buildDemoDoc());
  expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(3);
  // PDF_OUT=ruta.pdf npm test → guarda el archivo para revisarlo a ojo.
  if (process.env.PDF_OUT) writeFileSync(process.env.PDF_OUT, Buffer.from(pdf.output('arraybuffer')));
});
