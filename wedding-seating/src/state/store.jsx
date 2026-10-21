import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { historyReducer, initHistory } from './reducer';
import { loadDoc, saveDoc } from './storage';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [boot] = useState(loadDoc);
  const [state, dispatch] = useReducer(historyReducer, boot.doc, initHistory);
  const [saveState, setSaveState] = useState('saved');
  const first = useRef(true);

  useEffect(() => {
    if (first.current && boot.source !== 'migrated') {
      first.current = false;
      return undefined;
    }
    first.current = false;
    setSaveState('saving');
    const id = setTimeout(() => setSaveState(saveDoc(state.doc) ? 'saved' : 'error'), 350);
    return () => clearTimeout(id);
  }, [state.doc, boot.source]);

  // Si se cierra la pestaña antes de que venza el temporizador, guardamos en el acto.
  const latest = useRef(state.doc);
  latest.current = state.doc;
  useEffect(() => {
    const flush = () => saveDoc(latest.current);
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  const undo = useCallback(() => dispatch({ type: 'history/undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'history/redo' }), []);

  const value = useMemo(
    () => ({
      doc: state.doc,
      dispatch,
      undo,
      redo,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      undoLabel: state.past[state.past.length - 1]?.label ?? null,
      saveState,
      bootSource: boot.source,
    }),
    [state, undo, redo, saveState, boot.source],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de <StoreProvider>');
  return ctx;
}
