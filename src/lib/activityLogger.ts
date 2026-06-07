import { connectDB } from '@/lib/mongodb';
import { Activity } from '@/lib/models';

interface LogActivityParams {
  action: string;
  entityType: string;
  entityId: string;
  entityLabel?: string;
  performedBy?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await connectDB();
    await Activity.create({
      action:      params.action,
      entityType:  params.entityType,
      entityId:    params.entityId,
      entityLabel: params.entityLabel ?? '',
      performedBy: params.performedBy ?? null,
      metadata:    params.metadata ?? {},
    });
  } catch (err) {
    console.error('[activityLogger] Failed to log activity:', err);
  }
}
