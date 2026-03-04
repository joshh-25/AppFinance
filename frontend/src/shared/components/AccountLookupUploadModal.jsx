// Finance App File: frontend/src/shared/components/AccountLookupUploadModal.jsx
// Purpose: Upload modal for account-directory Excel imports.

export default function AccountLookupUploadModal({ open, importing, onClose, onUpload }) {
  if (!open) {
    return null;
  }

  return (
    <div className="upload-modal-backdrop" onClick={onClose}>
      <div className="upload-modal" onClick={(event) => event.stopPropagation()}>
        <div className="upload-modal-header">
          <div>
            <h3>Upload account files</h3>
            <p>Import monthly Excel billing files for account-number lookup.</p>
          </div>
          <button type="button" className="upload-modal-close" onClick={onClose} aria-label="Close account upload modal">
            x
          </button>
        </div>

        <div className="upload-modal-dropzone" role="group" aria-label="Account lookup file upload options">
          <p className="upload-modal-title">Choose Excel or CSV billing files</p>
          <p className="upload-modal-subtitle">
            XLSX, XLS, CSV formats. You can select multiple months in one upload.
          </p>

          <div className="upload-modal-actions-row">
            <label className={`upload-modal-action-btn btn btn-secondary ${importing ? 'is-disabled' : ''}`}>
              <span>Browse Files</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                multiple
                onChange={onUpload}
                disabled={importing}
              />
            </label>
          </div>

          <p className="upload-modal-hint">
            The system will scan Electricity, Water, and WiFi account-number columns and link them to Property names.
          </p>
        </div>

        {importing && <p className="muted-text" style={{ padding: '0 28px 24px' }}>Importing account directory files...</p>}
      </div>
    </div>
  );
}

