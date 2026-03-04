// Finance App File: frontend/src/shared/components/BillingsFlowTabs.jsx
// Purpose: Shared tabs UI for the Billings module flow.

import { BILLINGS_FLOW_STEPS, getBillingsFlowIndexByPath } from '../lib/billingsFlow.js';

export default function BillingsFlowTabs({ currentPath, onNavigate }) {
  const activeIndex = getBillingsFlowIndexByPath(currentPath);
  const resolvedActiveIndex = activeIndex >= 0 ? activeIndex : 0;

  return (
    <div className="bills-stepper billings-flow-tabs" role="tablist" aria-label="Billings flow steps">
      {BILLINGS_FLOW_STEPS.map((step, index) => {
        const isActive = index === resolvedActiveIndex;
        return (
          <button
            key={step.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`bills-step-btn ${isActive ? 'active' : ''}`}
            onClick={() => onNavigate(step.path)}
            disabled={isActive}
          >
            <span className="bills-step-index">{index + 1}</span>
            <span>{step.label}</span>
          </button>
        );
      })}
    </div>
  );
}

