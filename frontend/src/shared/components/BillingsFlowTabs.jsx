// Finance App File: frontend/src/shared/components/BillingsFlowTabs.jsx
// Purpose: Shared tabs UI for the Billings module flow.

import { useQuery } from '@tanstack/react-query';
import { BILLINGS_FLOW_STEPS, getBillingsFlowIndexByPath } from '../lib/billingsFlow.js';
import { getSessionQueryOptions, getStoredSessionRole } from '../lib/auth.js';
import { canRoleAccessAction, normalizeUserRole } from '../lib/permissions.js';

function StepIcon({ stepKey }) {
  if (stepKey === 'wifi') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path strokeLinecap="round" d="M3.5 9.5A12.5 12.5 0 0 1 20.5 9.5" />
        <path strokeLinecap="round" d="M6.8 12.8a8 8 0 0 1 10.4 0" />
        <path strokeLinecap="round" d="M10.1 16.1a3.4 3.4 0 0 1 3.8 0" />
        <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (stepKey === 'water') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5c3.6 4.1 6 7 6 10a6 6 0 1 1-12 0c0-3 2.4-5.9 6-10z" />
      </svg>
    );
  }
  if (stepKey === 'electricity') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 2.5L5.8 12H12l-1 9.5L18.2 12H12.8L13 2.5z" />
      </svg>
    );
  }
  if (stepKey === 'association') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <circle cx="8" cy="9" r="2.2" />
        <circle cx="16" cy="9" r="2.2" />
        <path strokeLinecap="round" d="M4.5 18c.6-2 2.1-3.2 3.5-3.2h0c1.4 0 2.9 1.2 3.5 3.2" />
        <path strokeLinecap="round" d="M12.5 18c.6-2 2.1-3.2 3.5-3.2h0c1.4 0 2.9 1.2 3.5 3.2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="4" y="4.5" width="16" height="15" rx="2.4" />
      <path strokeLinecap="round" d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  );
}

export default function BillingsFlowTabs({ currentPath, onNavigate }) {
  const { data: sessionData } = useQuery(getSessionQueryOptions());
  const activeIndex = getBillingsFlowIndexByPath(currentPath);
  const resolvedActiveIndex = activeIndex >= 0 ? activeIndex : 0;
  const currentRole = normalizeUserRole(sessionData?.role || getStoredSessionRole() || 'viewer', 'viewer');
  const canOpenBillScreens = canRoleAccessAction(currentRole, 'add');

  return (
    <div className="bills-stepper billings-flow-tabs" role="tablist" aria-label="Billings flow steps">
      {BILLINGS_FLOW_STEPS.map((step, index) => {
        const isActive = index === resolvedActiveIndex;
        const isBillStep = step.path.startsWith('/bills/');
        const isDisabled = isActive || (isBillStep && !canOpenBillScreens);
        return (
          <button
            key={step.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`bills-step-btn ${isActive ? 'active' : ''}`}
            onClick={() => onNavigate(step.path)}
            disabled={isDisabled}
          >
            <span className="bills-step-index">{index + 1}</span>
            <span className="bills-step-icon" aria-hidden="true">
              <StepIcon stepKey={step.key} />
            </span>
            <span>{step.label}</span>
          </button>
        );
      })}
    </div>
  );
}
