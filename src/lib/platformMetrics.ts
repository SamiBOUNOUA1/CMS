// @ts-nocheck
import mongoose from 'mongoose';
import { User, Order, Client, Quote, InventoryItem, Activity } from '@/lib/models';
import { runAsSystem } from '@/lib/tenantContext';
import { getBucket } from '@/lib/storage';

// Usage metrics for the platform console. Deliberately returns COUNTS ONLY —
// the SaaS operator monitors tenants without reading their business records.

type TenantCounts = { users: number; activeUsers: number; orders: number; customers: number };

/** Per-tenant counts for the tenants list, keyed by tenantId. */
export async function countsByTenant(): Promise<Record<string, TenantCounts>> {
  return runAsSystem(async () => {
    const group = (model, match = {}) => model.aggregate([
      { $match: match },
      { $group: { _id: '$tenantId', n: { $sum: 1 } } },
    ]);
    const [users, activeUsers, orders, customers] = await Promise.all([
      group(User), group(User, { isActive: true }), group(Order), group(Client),
    ]);
    const out: Record<string, TenantCounts> = {};
    const put = (rows, key) => rows.forEach(r => {
      const id = String(r._id);
      out[id] ??= { users: 0, activeUsers: 0, orders: 0, customers: 0 };
      out[id][key] = r.n;
    });
    put(users, 'users'); put(activeUsers, 'activeUsers'); put(orders, 'orders'); put(customers, 'customers');
    return out;
  });
}

/** Detailed counts for one tenant. */
export async function tenantMetrics(tenantId: string) {
  const tid = new mongoose.Types.ObjectId(tenantId);
  const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const metrics = await runAsSystem(async () => {
    const [users, activeUsers, orders, ordersLast30Days, customers, quotes, inventoryItems, lastActivity] = await Promise.all([
      User.countDocuments({ tenantId: tid }),
      User.countDocuments({ tenantId: tid, isActive: true }),
      Order.countDocuments({ tenantId: tid }),
      Order.countDocuments({ tenantId: tid, createdAt: { $gte: since30 } }),
      Client.countDocuments({ tenantId: tid }),
      Quote.countDocuments({ tenantId: tid }),
      InventoryItem.countDocuments({ tenantId: tid }),
      Activity.findOne({ tenantId: tid }).sort({ createdAt: -1 }).select('createdAt').lean(),
    ]);
    return { users, activeUsers, orders, ordersLast30Days, customers, quotes, inventoryItems, lastActivityAt: lastActivity?.createdAt ?? null };
  });

  let storageBytes = null;
  try {
    const [files] = await getBucket().getFiles({ prefix: `tenants/${tenantId}/` });
    storageBytes = files.reduce((s, f) => s + Number(f.metadata?.size || 0), 0);
  } catch {
    /* storage not configured locally — leave as unknown */
  }
  return { ...metrics, storageBytes };
}

/** Tenant admin accounts (name/email/status only) so the operator can help with access. */
export async function tenantAdmins(tenantId: string) {
  return runAsSystem(() =>
    User.find({ tenantId: new mongoose.Types.ObjectId(tenantId), role: 'admin' })
      .select('name email isActive').sort({ createdAt: 1 }).lean(),
  );
}
