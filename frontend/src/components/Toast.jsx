// Finance App File: frontend\src\components\Toast.jsx
// Purpose: Frontend/support source file for the Finance app.

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type || 'info'}`}>
          <div className="toast-main">
            <span className="toast-icon" aria-hidden="true">
              {toast.type === 'success' ? '✓' : toast.type === 'error' ? '!' : toast.type === 'warning' ? '!' : 'i'}
            </span>
            <span>
              <span className="toast-label">
                {toast.type === 'success' ? 'Success' : toast.type === 'error' ? 'Error' : toast.type === 'warning' ? 'Warning' : 'Info'}
                :
              </span>{' '}
              {toast.message}
            </span>
          </div>
          <button type="button" className="toast-close" onClick={() => onDismiss(toast.id)}>x</button>
        </div>
      ))}
    </div>
  );
}
