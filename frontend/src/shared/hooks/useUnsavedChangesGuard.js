// Finance App File: frontend\src\hooks\useUnsavedChangesGuard.js
// Purpose: Frontend/support source file for the Finance app.

import { useEffect, useState } from 'react';

export function useUnsavedChangesGuard({
  isDirty,
  shouldBypassPrompt = () => false,
  onSaveAndLeave
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingResolver, setPendingResolver] = useState(null);

  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }

    const beforeUnloadHandler = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', beforeUnloadHandler);
    return () => window.removeEventListener('beforeunload', beforeUnloadHandler);
  }, [isDirty]);

  async function handleNavigateAttempt(to) {
    if (!isDirty || shouldBypassPrompt(to)) {
      return true;
    }

    return new Promise((resolve) => {
      setPendingResolver(() => resolve);
      setIsOpen(true);
    });
  }

  function resolveAndClose(allowNavigation) {
    setIsOpen(false);
    if (pendingResolver) {
      pendingResolver(allowNavigation);
    }
    setPendingResolver(null);
  }

  function stayOnPage() {
    resolveAndClose(false);
  }

  function leaveWithoutSaving() {
    resolveAndClose(true);
  }

  async function saveAndLeave() {
    if (typeof onSaveAndLeave !== 'function') {
      resolveAndClose(false);
      return;
    }

    setIsSaving(true);
    const saved = await onSaveAndLeave();
    setIsSaving(false);

    if (saved) {
      resolveAndClose(true);
    } else {
      // Keep prompt open when save fails.
      if (pendingResolver) {
        pendingResolver(false);
      }
      setPendingResolver(null);
    }
  }

  return {
    isPromptOpen: isOpen,
    isPromptBusy: isSaving,
    handleNavigateAttempt,
    stayOnPage,
    leaveWithoutSaving,
    saveAndLeave
  };
}
