// Finance App File: frontend\src\hooks\useToast.js
// Purpose: Frontend/support source file for the Finance app.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

let nextToastId = 1;

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const toastTimeoutsRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    const timeoutId = toastTimeoutsRef.current.get(id);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      toastTimeoutsRef.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (type, message, timeout = 3500) => {
      const id = nextToastId++;
      setToasts((current) => [...current, { id, type, message }]);

      if (timeout > 0) {
        const timeoutId = window.setTimeout(() => removeToast(id), timeout);
        toastTimeoutsRef.current.set(id, timeoutId);
      }
    },
    [removeToast]
  );

  useEffect(() => {
    const timeoutMap = toastTimeoutsRef.current;
    return () => {
      timeoutMap.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      timeoutMap.clear();
    };
  }, []);

  return useMemo(() => ({ toasts, showToast, removeToast }), [toasts, showToast, removeToast]);
}
