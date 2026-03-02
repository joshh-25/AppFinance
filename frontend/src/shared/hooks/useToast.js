// Finance App File: frontend\src\hooks\useToast.js
// Purpose: Frontend/support source file for the Finance app.

import { useCallback, useMemo, useState } from 'react';

let nextToastId = 1;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (type, message, timeout = 3500) => {
      const id = nextToastId++;
      setToasts((current) => [...current, { id, type, message }]);

      if (timeout > 0) {
        window.setTimeout(() => removeToast(id), timeout);
      }
    },
    [removeToast]
  );

  return useMemo(() => ({ toasts, showToast, removeToast }), [toasts, showToast, removeToast]);
}
