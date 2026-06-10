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
    const permsHeader = request.headers.get('x-user-permissions');
    const perms = permsHeader ? JSON.parse(permsHeader) : {};
    if (!perms.manage_data) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { data, mode } = body;

    if (!data?.collections || typeof data.collections !== 'object') {
      return NextResponse.json({ error: 'Invalid export file format' }, { status: 400 });
    }

    const conflictMode: 'skip' | 'overwrite' = mode === 'overwrite' ? 'overwrite' : 'skip';

    await connectDB();

    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    for (const [key, records] of Object.entries(data.collections)) {
      if (!COLLECTION_MODELS[key]) continue;

      const model = COLLECTION_MODELS[key];

      try {
        // Special case: companySettings is a single document
        if (key === 'companySettings') {
          if (!records) continue;
          const doc = records as Record<string, unknown>;
          const { _id, __v, createdAt, updatedAt, ...fields } = doc;
          const existing = await CompanySettings.findOne({});
          if (existing) {
            if (conflictMode === 'overwrite') {
              await CompanySettings.findOneAndUpdate({}, { $set: fields });
              totalUpdated++;
            } else {
              totalSkipped++;
            }
          } else {
            await CompanySettings.create(fields);
            totalInserted++;
          }
          continue;
        }

        const arr = Array.isArray(records) ? records : [];
        if (arr.length === 0) continue;

        // Find which _ids already exist
        const ids = arr
          .map(r => r._id)
          .filter(id => id && mongoose.Types.ObjectId.isValid(id))
          .map(id => new mongoose.Types.ObjectId(String(id)));

        const existingIdSet = new Set<string>();
        if (ids.length > 0) {
          const existing = await model.find({ _id: { $in: ids } }).select('_id').lean();
          for (const doc of existing) {
            existingIdSet.add(String(doc._id));
          }
        }

        const newDocs = arr.filter(r => !existingIdSet.has(String(r._id)));
        const conflictDocs = arr.filter(r => existingIdSet.has(String(r._id)));

        // Insert new documents
        if (newDocs.length > 0) {
          const cleaned = newDocs.map(({ __v, createdAt, updatedAt, ...rest }) => ({
            ...rest,
            _id: new mongoose.Types.ObjectId(String(rest._id)),
          }));
          try {
            const result = await model.insertMany(cleaned, { ordered: false });
            totalInserted += result.length;
          } catch (insertErr: unknown) {
            // Handle partial inserts (duplicate key errors for some docs)
            if (insertErr?.insertedDocs) {
              totalInserted += insertErr.insertedDocs.length;
            }
            errors.push(`${key}: some records failed to insert`);
          }
        }

        // Handle conflicts
        if (conflictDocs.length > 0) {
          if (conflictMode === 'overwrite') {
            const bulkOps = conflictDocs.map(({ __v, createdAt, updatedAt, _id, ...fields }) => ({
              updateOne: {
                filter: { _id: new mongoose.Types.ObjectId(String(_id)) },
                update: { $set: fields },
                upsert: false,
              },
            }));
            const result = await model.bulkWrite(bulkOps, { ordered: false });
            totalUpdated += result.modifiedCount ?? 0;
          } else {
            totalSkipped += conflictDocs.length;
          }
        }
      } catch (collErr: unknown) {
        errors.push(`${key}: ${collErr instanceof Error ? collErr.message : String(collErr)}`);
      }
    }

    return NextResponse.json({ inserted: totalInserted, updated: totalUpdated, skipped: totalSkipped, errors });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
