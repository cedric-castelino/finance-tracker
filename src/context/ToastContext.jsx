import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const toast = useCallback((message, { tone = 'success', action } = {}) => {
    const id = ++idRef.current;
    setToasts(t => [...t.slice(-2), { id, message, tone, action }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), action ? 6000 : 3200);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none bottom-[calc(96px+env(safe-area-inset-bottom))] lg:bottom-6">
        {toasts.map(t => (
          <div key={t.id} role="status" className="animate-toast pointer-events-auto flex items-center gap-3 rounded-xl bg-forest-900 text-cream-50 pl-3.5 pr-2 py-2.5 shadow-lg max-w-md w-full sm:w-auto">
            {t.tone === 'error'
              ? <ExclamationTriangleIcon className="h-5 w-5 text-gold-500 shrink-0" />
              : <CheckCircleIcon className="h-5 w-5 text-forest-300 shrink-0" />}
            <span className="text-sm font-medium flex-1 pr-2">{t.message}</span>
            {t.action && (
              <button className="text-sm font-semibold text-gold-500 px-2 py-1 rounded-md hover:bg-white/10" onClick={() => { t.action.onClick(); setToasts(x => x.filter(y => y.id !== t.id)); }}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
