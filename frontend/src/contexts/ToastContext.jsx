import { createContext, useContext, useState } from 'react';
import { Toasts } from '../components/ui';

const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = (msg, kind = 'ok') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <Toasts toasts={toasts} />
    </ToastContext.Provider>
  );
}
