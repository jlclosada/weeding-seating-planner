import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const show = useCallback(
    (message, { action, tone = 'default', duration } = {}) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((list) => [...list.slice(-2), { id, message, action, tone }]);
      timers.current.set(id, setTimeout(() => dismiss(id), duration ?? (action ? 6000 : 3200)));
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+88px)] z-[90] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`slide-up pointer-events-auto flex max-w-[min(92vw,520px)] items-center gap-4 rounded-xl px-4 py-2.5 text-[13.5px] shadow-lift ${
                t.tone === 'error' ? 'bg-danger text-white' : 'bg-ink text-paper'
              }`}
            >
              <span>{t.message}</span>
              {t.action && (
                <button
                  className="-mr-1 rounded-md px-2 py-1 font-medium text-[#E2C792] hover:bg-white/10"
                  onClick={() => {
                    t.action.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext);
