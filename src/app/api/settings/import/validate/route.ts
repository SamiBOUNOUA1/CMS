// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';
import {
  CompanySettings, EventTypeConfig, OrderStatusConfig, CustomerTypeConfig,
  StaffRoleConfig, TravelRegionConfig, FlowTemplate, ModuleConfig,
  Category, Product,
  InventoryCategory, Supplier, Warehouse, InventoryItem,
  KitchenStockItem, KitchenRecipe,
  Client, Venue,
  Role, RolePermissions,
} from '@/lib/models';
import { requirePermission } from '@/lib/requireAuth';

const COLLECTION_MODELS: Record<string, unknown> = {
  companySettings:     CompanySettings,
  eventTypeConfigs:    EventTypeConfig,
  orderStatusConfigs:  OrderStatusConfig,
  customerTypeConfigs: CustomerTypeConfig,
  staffRoleConfigs:    StaffRoleConfig,
  travelRegionConfigs: TravelRegionConfig,
  flowTemplates:       FlowTemplate,
  moduleConfigs:       ModuleConfig,
  categories:          Category,
  products:            Product,
  inventoryCategories: InventoryCategory,
  suppliers:           Supplier,
  warehouses:          Warehouse,
  inventoryItems:      InventoryItem,
  kitchenStockItems:   KitchenStockItem,
  kitchenRecipes:      KitchenRecipe,
  clients:             Client,
  venues:              Venue,
  roles:               Role,
  rolePermissions:     RolePermissions,
};

export async function POST(request: NextRequest) {
  try {
    const { error } = await requirePermission(request, 'manage_data');
    if (error) return error;

    const body = await request.json();
    const { data } = body;

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Invalid export file format' }, { status: 400 });
    }

    const warnings: string[] = [];

    if (data.version !== '1.0') {
      warnings.push(`File version "${data.version}" may not be fully compatible with this app version.`);
    }

    if (!data.collections || typeof data.collections !== 'object') {
      return NextResponse.json({ error: 'Export file is missing collections data' }, { status: 400 });
    }

    await connectDB();

    const collectionResults: Record<string, { label: string; total: number; conflicts: number }> = {};

    for (const [key, records] of Object.entries(data.collections)) {
      if (!COLLECTION_MODELS[key]) {
        warnings.push(`Unknown collection "${key}" will be ignored.`);
        continue;
      }

      const model = COLLECTION_MODELS[key] as { find: Function; countDocuments: Function };

      // Handle singular companySettings (object, not array)
      if (key === 'companySettings') {
        const existing = await CompanySettings.countDocuments({});
        collectionResults[key] = { label: key, total: 1, conflicts: records ? existing : 0 };
        continue;
      }

      const arr = Array.isArray(records) ? records : [];
      const total = arr.length;

      if (total === 0) {
        collectionResults[key] = { label: key, total: 0, conflicts: 0 };
        continue;
      }

      // Extract valid ObjectIds from records
      const ids = arr
        .map(r => r._id)
        .filter(id => id && mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(String(id)));

      let conflicts = 0;
      if (ids.length > 0) {
        conflicts = await model.countDocuments({ _id: { $in: ids } });
      }

      collectionResults[key] = { label: key, total, conflicts };
    }

    return NextResponse.json({ collections: collectionResults, warnings });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
