import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [message, setMessage] = useState(null);
  const timer = useRef();
  const show = useCallback((text) => {
    setMessage(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2600);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {message && <div className="toast" role="status">{message}</div>}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
