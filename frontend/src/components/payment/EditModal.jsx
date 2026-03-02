// Finance App File: frontend/src/components/payment/EditModal.jsx
// Purpose: Edit/save/error/unsaved modal composition for payment workflows.

import ConfirmDialog from '../ConfirmDialog.jsx';
import ErrorDialog from '../ErrorDialog.jsx';

export default function EditModal({
  isConfirmOpen,
  isEditMode,
  onConfirmCancel,
  onConfirmAccept,
  saving,
  errorDialog,
  onErrorClose,
  isUnsavedPromptOpen,
  unsavedMessage,
  onUnsavedCancel,
  onUnsavedConfirm,
  isUnsavedBusy
}) {
  return (
    <>
      <ConfirmDialog
        open={isConfirmOpen}
        title={isEditMode ? 'Update Record' : 'Save Record'}
        message={isEditMode ? 'Update this record?' : 'Save this record?'}
        confirmText={isEditMode ? 'Update Record' : 'Save Record'}
        cancelText="Cancel"
        onCancel={onConfirmCancel}
        onConfirm={onConfirmAccept}
        busy={saving}
      />
      <ErrorDialog
        open={errorDialog.open}
        title={errorDialog.title}
        message={errorDialog.message}
        buttonText="OK"
        onClose={onErrorClose}
      />
      <ConfirmDialog
        open={isUnsavedPromptOpen}
        title="Unsaved Changes"
        message={unsavedMessage}
        confirmText="Leave Without Saving"
        cancelText="Keep Editing"
        onCancel={onUnsavedCancel}
        onConfirm={onUnsavedConfirm}
        busy={isUnsavedBusy}
      />
    </>
  );
}
