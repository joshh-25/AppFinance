// Finance App File: frontend/src/components/payment/UploadModal.jsx
// Purpose: Upload modal UI for bill file parsing.

import { SkeletonButton } from './Skeleton.jsx';

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
          </div>
          <button type="button" className="upload-modal-close" onClick={onClose} aria-label="Close upload modal">
            x
          </button>
        </div>

        <div className="upload-modal-dropzone" role="group" aria-label="Upload options">
          <p className="upload-modal-title">Choose a file or use your phone camera</p>
          <p className="upload-modal-subtitle">On phones, camera capture is the fastest way to add a bill.</p>

          <div className="upload-modal-actions-row">
            {uploading ? (
              <>
                <SkeletonButton width={150} height={44} />
                <SkeletonButton width={150} height={44} />
              </>
            ) : (
              <>
                <label className={`upload-modal-action-btn upload-modal-action-camera btn btn-secondary ${uploading ? 'is-disabled' : ''}`}>
                  <span>Use Camera</span>
                  <input type="file" accept="image/*" capture="environment" onChange={onUpload} disabled={uploading} />
                </label>

                <label className={`upload-modal-action-btn upload-modal-action-browse btn btn-secondary ${uploading ? 'is-disabled' : ''}`}>
                  <span>Browse File</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,image/*,application/pdf"
                    multiple
                    onChange={onUpload}
                    disabled={uploading}
                  />
                </label>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
