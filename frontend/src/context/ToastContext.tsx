import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const toneStyles: Record<ToastType, { badge: string; border: string; text: string }> = {
  success: {
    badge: 'bg-emerald-500',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
  },
  error: {
    badge: 'bg-red-500',
    border: 'border-red-200',
    text: 'text-red-900',
  },
  warning: {
    badge: 'bg-amber-500',
    border: 'border-amber-200',
    text: 'text-amber-900',
  },
  info: {
    badge: 'bg-indigo-500',
    border: 'border-indigo-200',
    text: 'text-indigo-900',
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', title?: string, duration = 4200) => {
    const id = Date.now() + Math.random();
    const toastTitle = title ?? {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Notice',
    }[type];

    setToasts((current) => [...current, { id, type, title: toastTitle, message, duration }]);
    window.setTimeout(() => dismissToast(id), duration);
  }, [dismissToast]);

  const value = useMemo<ToastContextValue>(() => ({ addToast, dismissToast }), [addToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="pointer-events-none fixed inset-x-0 top-3 z-[9999] mx-auto flex max-w-md flex-col gap-2 px-3 sm:inset-x-auto sm:right-3 sm:max-w-sm sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full items-start gap-3 rounded-2xl border bg-white/95 p-3 shadow-xl shadow-slate-900/10 backdrop-blur ${toneStyles[toast.type].border}`}
            role="status"
          >
            <span className={`mt-0.5 inline-flex h-2.5 w-2.5 rounded-full ${toneStyles[toast.type].badge}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className={`text-sm font-bold ${toneStyles[toast.type].text}`}>{toast.title}</div>
              {toast.message && <div className="mt-0.5 text-sm text-slate-700 break-words">{toast.message}</div>}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              className="ml-2 text-slate-400 transition hover:text-slate-700"
              onClick={() => dismissToast(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
