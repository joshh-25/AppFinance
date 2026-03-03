// Finance App File: frontend/src/components/payment/UploadModal.jsx
// Purpose: Upload modal UI for bill file parsing.

export default function UploadModal({ open, uploading, onClose, onUpload }) {
  if (!open) {
    return null;
  }

  return (
    <div className="upload-modal-backdrop" onClick={onClose}>
      <div className="upload-modal" onClick={(event) => event.stopPropagation()}>
        <div className="upload-modal-header">
          <div>
            <h3>Upload files</h3>
            <p>Select and upload the files of your choice</p>
          </div>
          <button type="button" className="upload-modal-close" onClick={onClose} aria-label="Close upload modal">
            x
          </button>
        </div>

        <div className="upload-modal-dropzone" role="group" aria-label="Upload options">
          <p className="upload-modal-title">Choose a file or drag and drop it here</p>
          <p className="upload-modal-subtitle">JPEG, PNG, WEBP, HEIC, HEIF, PDF formats, up to 10MB</p>

          <div className="upload-modal-actions-row">
            <label className={`upload-modal-action-btn btn btn-secondary ${uploading ? 'is-disabled' : ''}`}>
              <span>Browse File</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,image/*,application/pdf"
                multiple
                onChange={onUpload}
                disabled={uploading}
              />
            </label>

            <label className={`upload-modal-action-btn btn btn-secondary ${uploading ? 'is-disabled' : ''}`}>
              <span>Use Camera</span>
              <input type="file" accept="image/*" capture="environment" onChange={onUpload} disabled={uploading} />
            </label>
          </div>

          <p className="upload-modal-hint">
            Tip: On phone, use camera for receipts and bills. On desktop, use Browse File.
          </p>
        </div>

        {uploading && <p className="muted-text">Uploading and scanning selected file(s)...</p>}
      </div>
    </div>
  );
}
