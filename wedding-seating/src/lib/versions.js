import { useCallback, useState } from 'react';
import { uid } from '../state/model';

const KEY = 'wsp:versions:v1';
const LIMIT = 30;

const read = () => {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

/** Instantáneas con nombre del plano, guardadas aparte para que deshacer no las toque. */
export function useVersions() {
  const [versions, setVersions] = useState(read);

  const persist = useCallback((next) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setVersions(next);
      return true;
    } catch {
      return false;
    }
  }, []);

  const save = useCallback((name, doc) => persist([{ id: uid(), name, date: new Date().toISOString(), doc }, ...read()].slice(0, LIMIT)), [persist]);
  const remove = useCallback((id) => persist(read().filter((v) => v.id !== id)), [persist]);

  return { versions, save, remove };
}
