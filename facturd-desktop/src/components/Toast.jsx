import { useState, useEffect, createContext, useContext } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-6 py-4 rounded-lg shadow-xl animate-slide-in flex items-center gap-3 ${
              toast.type === 'success' 
                ? 'bg-green-600 text-white' 
                : toast.type === 'warning'
                ? 'bg-yellow-600 text-white'
                : toast.type === 'info'
                ? 'bg-blue-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            <span className="material-symbols-outlined">
              {toast.type === 'success' ? 'check_circle' : toast.type === 'warning' ? 'warning' : toast.type === 'info' ? 'info' : 'error'}
            </span>
            <span className="font-medium">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
