const ROLE_PRIORITY = {
  viewer: 1,
  editor: 2,
  admin: 3
};

const ACTION_ROLE_MAP = {
  list: 'viewer',
  list_merged: 'viewer',
  dashboard_summary: 'viewer',
  review_queue_list: 'viewer',
  review_queue_summary: 'viewer',
  property_record_list: 'viewer',
  expense_list: 'viewer',
  account_lookup_search: 'viewer',
  review_queue_replace: 'editor',
  add: 'editor',
  bill_update: 'editor',
  upload_bill: 'editor',
  expense_create: 'admin',
  expense_update: 'admin',
  expense_delete: 'admin',
  account_lookup_import: 'admin',
  property_record_create: 'admin',
  property_record_update: 'admin',
  property_record_delete: 'admin'
};

export function normalizeUserRole(role, defaultRole = 'viewer') {
  const normalizedDefault = String(defaultRole || '')
    .trim()
    .toLowerCase();
  const safeDefault = ROLE_PRIORITY[normalizedDefault] ? normalizedDefault : 'viewer';
  const normalizedRole = String(role || '')
    .trim()
    .toLowerCase();

  return ROLE_PRIORITY[normalizedRole] ? normalizedRole : safeDefault;
}

export function formatUserRole(role) {
  const normalized = normalizeUserRole(role);
  if (normalized === 'admin') {
    return 'Admin';
  }
  if (normalized === 'editor') {
    return 'Editor';
  }
  return 'Viewer';
}

export function getRolePriority(role) {
  return ROLE_PRIORITY[normalizeUserRole(role)] || ROLE_PRIORITY.viewer;
}

export function canRoleAccessRole(role, requiredRole = 'viewer') {
  return getRolePriority(role) >= getRolePriority(requiredRole);
}

export function getRequiredRoleForAction(action) {
  const normalizedAction = String(action || '')
    .trim()
    .toLowerCase();
  return ACTION_ROLE_MAP[normalizedAction] || 'viewer';
}

export function canRoleAccessAction(role, action) {
  return canRoleAccessRole(role, getRequiredRoleForAction(action));
}
