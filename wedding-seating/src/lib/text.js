export const normalize = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export const initials = (name) => {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  const first = [...words[0]][0] ?? '';
  const last = words.length > 1 ? [...words[words.length - 1]][0] ?? '' : [...words[0]][1] ?? '';
  return (first + last).toUpperCase();
};

/** "Elena & Pablo" → "E&P"; "Nuestra boda" → "NB". */
export const monogram = (title) => {
  const parts = String(title ?? '').split(/\s*(?:&|\by\b|\+)\s*/i).filter(Boolean);
  if (parts.length >= 2) return `${initials(parts[0])[0]}&${initials(parts[1])[0]}`;
  return initials(title);
};

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const slug = (s) => normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'boda';
