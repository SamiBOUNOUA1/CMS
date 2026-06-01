// All permission keys recognised by the system
export const ALL_PERMISSIONS = [
  'view_orders',
  'create_orders',
  'edit_orders',
  'delete_orders',
  'create_quotes',
  'delete_quotes',
  'manage_catalog',
  'manage_users',
  'manage_event_types',
  'manage_order_statuses',
  'view_customers',
  'edit_customers',
  'delete_customers',
  'manage_customer_types',
  'manage_flow_templates',
  'update_flow_status',
  'view_calendar',
];

// Fallback defaults for the three built-in roles. For dynamically created roles,
// buildPermissions() already defaults all keys to false when no entry exists here.
export const DEFAULT_PERMISSIONS = {
  admin: {
    view_orders:            true,
    create_orders:          true,
    edit_orders:            true,
    delete_orders:          true,
    create_quotes:          true,
    delete_quotes:          true,
    manage_catalog:         true,
    manage_users:           true,
    manage_event_types:     true,
    manage_order_statuses:  true,
    view_customers:         true,
    edit_customers:         true,
    delete_customers:       true,
    manage_customer_types:  true,
    manage_flow_templates:  true,
    update_flow_status:     true,
    view_calendar:          true,
  },
  manager: {
    view_orders:            false,
    create_orders:          false,
    edit_orders:            false,
    delete_orders:          false,
    create_quotes:          false,
    delete_quotes:          false,
    manage_catalog:         false,
    manage_users:           false,
    manage_event_types:     false,
    manage_order_statuses:  false,
    view_customers:         false,
    edit_customers:         false,
    delete_customers:       false,
    manage_customer_types:  false,
    manage_flow_templates:  false,
    update_flow_status:     true,
    view_calendar:          false,
  },
  viewer: {
    view_orders:            true,
    create_orders:          false,
    edit_orders:            false,
    delete_orders:          false,
    create_quotes:          false,
    delete_quotes:          false,
    manage_catalog:         false,
    manage_users:           false,
    manage_event_types:     false,
    manage_order_statuses:  false,
    view_customers:         true,
    edit_customers:         false,
    delete_customers:       false,
    manage_customer_types:  false,
    manage_flow_templates:  false,
    update_flow_status:     false,
    view_calendar:          false,
  },
};

/** Returns a flat permissions object for a role, merging defaults with stored overrides. */
export function buildPermissions(role, storedMap) {
  const defaults = DEFAULT_PERMISSIONS[role] ?? Object.fromEntries(ALL_PERMISSIONS.map(p => [p, false]));
  if (!storedMap) return defaults;
  const out = { ...defaults };
  for (const key of ALL_PERMISSIONS) {
    if (storedMap.has ? storedMap.has(key) : key in storedMap) {
      out[key] = storedMap.get ? storedMap.get(key) : storedMap[key];
    }
  }
  return out;
}
