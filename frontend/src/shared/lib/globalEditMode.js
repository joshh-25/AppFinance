// Finance App File: frontend\src\lib\globalEditMode.js
// Purpose: Frontend/support source file for the Finance app.

const GLOBAL_EDIT_MODE_KEY = 'finance:global-edit-mode';
const GLOBAL_EDIT_MODE_EVENT = 'finance:global-edit-mode-change';
const EDIT_SCOPES = ['bills', 'property'];
const DEFAULT_SCOPE = 'bills';

function emitGlobalEditModeChange(snapshot) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(GLOBAL_EDIT_MODE_EVENT, { detail: snapshot }));
}

function parseStoredValue(rawValue) {
  const defaultScopes = {
    bills: { active: false, context: null },
    property: { active: false, context: null }
  };

  const normalizeScope = (value) => {
    const candidate = String(value || '').trim().toLowerCase();
    return EDIT_SCOPES.includes(candidate) ? candidate : DEFAULT_SCOPE;
  };

  const pickPrimaryScope = (scopes, preferredScope) => {
    const safePreferred = normalizeScope(preferredScope);
    if (scopes[safePreferred]?.active === true) {
      return safePreferred;
    }
    const firstActive = EDIT_SCOPES.find((scope) => scopes[scope]?.active === true);
    return firstActive || safePreferred;
  };

  const buildSnapshot = (scopes, currentScope) => {
    const primaryScope = pickPrimaryScope(scopes, currentScope);
    return {
      active: scopes[primaryScope]?.active === true,
      context: scopes[primaryScope]?.context && typeof scopes[primaryScope].context === 'object'
        ? scopes[primaryScope].context
        : null,
      current_scope: primaryScope,
      scopes
    };
  };

  if (!rawValue) {
    return buildSnapshot(defaultScopes, DEFAULT_SCOPE);
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object') {
      return buildSnapshot(defaultScopes, DEFAULT_SCOPE);
    }

    const hasScopedShape = parsed.scopes && typeof parsed.scopes === 'object';
    if (hasScopedShape) {
      const scopes = { ...defaultScopes };
      EDIT_SCOPES.forEach((scope) => {
        const rawScope = parsed.scopes?.[scope];
        if (rawScope && typeof rawScope === 'object') {
          scopes[scope] = {
            active: rawScope.active === true,
            context: rawScope.context && typeof rawScope.context === 'object' ? rawScope.context : null
          };
        }
      });
      return buildSnapshot(scopes, parsed.current_scope);
    }

    // Legacy shape fallback: map existing global context to bills scope.
    const legacyScopes = {
      ...defaultScopes,
      bills: {
        active: parsed.active === true,
        context: parsed.context && typeof parsed.context === 'object' ? parsed.context : null
      }
    };
    return buildSnapshot(legacyScopes, DEFAULT_SCOPE);
  } catch {
    return buildSnapshot(defaultScopes, DEFAULT_SCOPE);
  }
}

export function getGlobalEditMode() {
  if (typeof window === 'undefined') {
    return parseStoredValue('');
  }

  return parseStoredValue(window.sessionStorage.getItem(GLOBAL_EDIT_MODE_KEY));
}

function saveSnapshot(snapshot) {
  window.sessionStorage.setItem(GLOBAL_EDIT_MODE_KEY, JSON.stringify(snapshot));
  emitGlobalEditModeChange(snapshot);
}

function normalizeScopeName(scope) {
  const normalized = String(scope || '').trim().toLowerCase();
  return EDIT_SCOPES.includes(normalized) ? normalized : DEFAULT_SCOPE;
}

export function getScopedGlobalEditMode(scope = DEFAULT_SCOPE) {
  const snapshot = getGlobalEditMode();
  const scopeName = normalizeScopeName(scope);
  const scoped = snapshot.scopes?.[scopeName] || { active: false, context: null };
  return {
    active: scoped.active === true,
    context: scoped.context && typeof scoped.context === 'object' ? scoped.context : null
  };
}

export function setScopedGlobalEditMode(scope = DEFAULT_SCOPE, context = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  const snapshot = getGlobalEditMode();
  const scopeName = normalizeScopeName(scope);
  const nextScopes = {
    bills: { ...(snapshot.scopes?.bills || { active: false, context: null }) },
    property: { ...(snapshot.scopes?.property || { active: false, context: null }) }
  };
  nextScopes[scopeName] = {
    active: true,
    context: context && typeof context === 'object' ? context : {}
  };

  const nextSnapshot = {
    ...snapshot,
    current_scope: scopeName,
    scopes: nextScopes,
    active: true,
    context: nextScopes[scopeName].context
  };
  saveSnapshot(nextSnapshot);
}

export function clearScopedGlobalEditMode(scope = DEFAULT_SCOPE) {
  if (typeof window === 'undefined') {
    return;
  }

  const snapshot = getGlobalEditMode();
  const scopeName = normalizeScopeName(scope);
  const nextScopes = {
    bills: { ...(snapshot.scopes?.bills || { active: false, context: null }) },
    property: { ...(snapshot.scopes?.property || { active: false, context: null }) }
  };
  nextScopes[scopeName] = { active: false, context: null };

  const nextActiveScope = EDIT_SCOPES.find((name) => nextScopes[name]?.active === true) || DEFAULT_SCOPE;
  const nextSnapshot = {
    ...snapshot,
    current_scope: nextActiveScope,
    scopes: nextScopes,
    active: nextScopes[nextActiveScope]?.active === true,
    context: nextScopes[nextActiveScope]?.active === true ? nextScopes[nextActiveScope].context : null
  };
  saveSnapshot(nextSnapshot);
}

export function setGlobalEditMode(context = {}) {
  setScopedGlobalEditMode(DEFAULT_SCOPE, context);
}

export function clearGlobalEditMode() {
  if (typeof window === 'undefined') {
    return;
  }

  const clearedSnapshot = parseStoredValue('');
  saveSnapshot(clearedSnapshot);
}

export function clearAllScopedGlobalEditMode() {
  clearGlobalEditMode();
}

export function subscribeGlobalEditMode(onChange) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleLocal = (event) => {
    if (typeof onChange !== 'function') {
      return;
    }
    if (event?.detail && typeof event.detail === 'object') {
      onChange(parseStoredValue(JSON.stringify(event.detail)));
      return;
    }
    onChange(getGlobalEditMode());
  };

  const handleStorage = (event) => {
    if (event.key !== GLOBAL_EDIT_MODE_KEY) {
      return;
    }
    if (typeof onChange === 'function') {
      onChange(parseStoredValue(event.newValue));
    }
  };

  window.addEventListener(GLOBAL_EDIT_MODE_EVENT, handleLocal);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(GLOBAL_EDIT_MODE_EVENT, handleLocal);
    window.removeEventListener('storage', handleStorage);
  };
}

// Legacy aliases (kept for existing imports)
export function setGlobalEditModeLegacy(context = {}) {
  const snapshot = {
    active: true,
    context: context && typeof context === 'object' ? context : {}
  };
  saveSnapshot(snapshot);
}
