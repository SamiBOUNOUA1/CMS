// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import {
  CompanySettings, EventTypeConfig, OrderStatusConfig, CustomerTypeConfig,
  StaffRoleConfig, TravelRegionConfig, FlowTemplate, ModuleConfig,
  Category, Product,
  InventoryCategory, Supplier, Warehouse, InventoryItem,
  KitchenStockItem, KitchenRecipe,
  Client, Venue,
  Role, RolePermissions,
} from '@/lib/models';

const GROUP_COLLECTIONS: Record<string, { key: string; model: unknown }[]> = {
  settings: [
    { key: 'companySettings',     model: CompanySettings },
    { key: 'eventTypeConfigs',    model: EventTypeConfig },
    { key: 'orderStatusConfigs',  model: OrderStatusConfig },
    { key: 'customerTypeConfigs', model: CustomerTypeConfig },
    { key: 'staffRoleConfigs',    model: StaffRoleConfig },
    { key: 'travelRegionConfigs', model: TravelRegionConfig },
    { key: 'flowTemplates',       model: FlowTemplate },
    { key: 'moduleConfigs',       model: ModuleConfig },
  ],
  catalog: [
    { key: 'categories', model: Category },
    { key: 'products',   model: Product },
  ],
  inventory: [
    { key: 'inventoryCategories', model: InventoryCategory },
    { key: 'suppliers',           model: Supplier },
    { key: 'warehouses',          model: Warehouse },
    { key: 'inventoryItems',      model: InventoryItem },
  ],
  kitchen: [
    { key: 'kitchenStockItems', model: KitchenStockItem },
    { key: 'kitchenRecipes',    model: KitchenRecipe },
  ],
  customers: [
    { key: 'clients', model: Client },
    { key: 'venues',  model: Venue },
  ],
  admin: [
    { key: 'roles',           model: Role },
    { key: 'rolePermissions', model: RolePermissions },
  ],
};

export async function GET(request: NextRequest) {
  try {
    const permsHeader = request.headers.get('x-user-permissions');
    const perms = permsHeader ? JSON.parse(permsHeader) : {};
    if (!perms.manage_data) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const groupsParam = searchParams.get('groups');
    const requestedGroups = groupsParam
      ? groupsParam.split(',').map(g => g.trim()).filter(g => GROUP_COLLECTIONS[g])
      : Object.keys(GROUP_COLLECTIONS);

    const collections: Record<string, unknown> = {};

    for (const groupKey of requestedGroups) {
      for (const { key, model } of GROUP_COLLECTIONS[groupKey]) {
        if (key === 'companySettings') {
          const doc = await (model as typeof CompanySettings).findOne({}).lean();
          collections[key] = doc ?? null;
        } else {
          collections[key] = await (model as { find: Function }).find({}).lean();
        }
      }
    }

    const envelope = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      collections,
    };

    return NextResponse.json(envelope);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
