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
  'view_inventory',
  'manage_inventory',
  'view_tasks',
  'create_tasks',
  'delete_tasks',
] as const;

export type PermissionKey = typeof ALL_PERMISSIONS[number];
export type PermissionsMap = Record<PermissionKey, boolean>;

export const DEFAULT_PERMISSIONS: Record<string, PermissionsMap> = {
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
    view_inventory:         true,
    manage_inventory:       true,
    view_tasks:             true,
    create_tasks:           true,
    delete_tasks:           true,
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
    view_inventory:         false,
    manage_inventory:       false,
    view_tasks:             true,
    create_tasks:           true,
    delete_tasks:           false,
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
    view_inventory:         false,
    manage_inventory:       false,
    view_tasks:             true,
    create_tasks:           true,
    delete_tasks:           false,
  },
};

type StoredMap = Map<string, boolean> | Record<string, boolean>;

/** Returns a flat permissions object for a role, merging defaults with stored overrides. */
export function buildPermissions(role: string, storedMap?: StoredMap | null): PermissionsMap {
  const defaults: PermissionsMap =
    DEFAULT_PERMISSIONS[role] ??
    Object.fromEntries(ALL_PERMISSIONS.map(p => [p, false])) as PermissionsMap;

  if (!storedMap) return defaults;
  const out = { ...defaults };
  for (const key of ALL_PERMISSIONS) {
    const hasKey = storedMap instanceof Map ? storedMap.has(key) : key in storedMap;
    if (hasKey) {
      out[key] = storedMap instanceof Map
        ? storedMap.get(key) as boolean
        : (storedMap as Record<string, boolean>)[key];
    }
  }
  return out;
}
