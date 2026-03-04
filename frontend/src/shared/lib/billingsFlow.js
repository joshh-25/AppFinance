// Finance App File: frontend/src/shared/lib/billingsFlow.js
// Purpose: Shared tab/step metadata for the Billings module flow.

export const BILLINGS_FLOW_STEPS = [
  { key: 'wifi', label: 'WiFi Bills', path: '/bills/wifi' },
  { key: 'water', label: 'Water Bills', path: '/bills/water' },
  { key: 'electricity', label: 'Electricity Bills', path: '/bills/electricity' },
  { key: 'association', label: 'Association Bills', path: '/bills/association' },
  { key: 'property-records', label: 'Property Records', path: '/property-records' }
];

function normalizePath(path) {
  return String(path || '')
    .trim()
    .toLowerCase();
}

export function getBillingsFlowIndexByPath(path) {
  const normalized = normalizePath(path);
  return BILLINGS_FLOW_STEPS.findIndex(
    (step) => normalized === step.path || normalized.startsWith(`${step.path}/`)
  );
}

export function getBillingsFlowNextPath(path) {
  const index = getBillingsFlowIndexByPath(path);
  if (index < 0 || index >= BILLINGS_FLOW_STEPS.length - 1) {
    return null;
  }
  return BILLINGS_FLOW_STEPS[index + 1].path;
}

export function getBillingsFlowPrevPath(path) {
  const index = getBillingsFlowIndexByPath(path);
  if (index <= 0) {
    return null;
  }
  return BILLINGS_FLOW_STEPS[index - 1].path;
}
