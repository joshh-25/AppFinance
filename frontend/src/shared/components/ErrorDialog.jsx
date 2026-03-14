// Finance App File: frontend\src\components\ErrorDialog.jsx
// Purpose: Frontend/support source file for the Finance app.

import { useEffect, useRef } from 'react';

export default function ErrorDialog({
  open,
  title = 'Error',
  message = 'Something went wrong.',
  buttonText = 'OK',
  onClose
}) {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      buttonRef.current?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="confirm-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="confirm-dialog error-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="error-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="error-dialog-title" className="confirm-dialog-title">
          {title}
        </h3>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          <button ref={buttonRef} type="button" className="btn active" onClick={onClose}>
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
