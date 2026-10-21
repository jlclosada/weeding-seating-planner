const NEUTRAL = '#9A9184';

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const mix = (hex, target, amount) => {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  return rgbToHex(a.map((v, i) => v + (b[i] - v) * amount));
};

const cache = new Map();

/** Deriva, a partir del color base de un grupo, fondo suave, borde y texto legible. */
export function tone(color) {
  const base = /^#[0-9a-f]{6}$/i.test(color ?? '') ? color : NEUTRAL;
  if (!cache.has(base)) {
    cache.set(base, { base, bg: mix(base, '#FFFDF9', 0.78), border: base, fg: mix(base, '#1E1A16', 0.5) });
  }
  return cache.get(base);
}

export const toneStyle = (color) => {
  const t = tone(color);
  return { backgroundColor: t.bg, borderColor: t.border, color: t.fg };
};
