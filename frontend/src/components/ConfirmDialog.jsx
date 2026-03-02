// Finance App File: frontend\src\components\ConfirmDialog.jsx
// Purpose: Frontend/support source file for the Finance app.

import { useEffect, useRef } from 'react';

export default function ConfirmDialog({
  open,
  title = 'Please Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  secondaryText = '',
  onConfirm,
  onCancel,
  onSecondary,
  busy = false
}) {
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        onCancel?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, busy, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div className="confirm-dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="confirm-dialog-title" className="confirm-dialog-title">
          {title}
        </h3>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            {cancelText}
          </button>
          {secondaryText && typeof onSecondary === 'function' && (
            <button type="button" className="btn btn-danger" onClick={onSecondary} disabled={busy}>
              {secondaryText}
            </button>
          )}
          <button ref={confirmButtonRef} type="button" className="btn active" onClick={onConfirm} disabled={busy}>
            {busy ? 'Please wait...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
