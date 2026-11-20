// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order, Quote, Payment, Invoice } from '@/lib/models';
import { getOrderPayableTotal, syncPaymentState } from '@/lib/invoicing';
import { logActivity } from '@/lib/activityLogger';
import { getAuth, requirePermission } from '@/lib/requireAuth';
import { lineGroupsTotal, normalizeLineGroups } from '@/lib/pricing';
import { applyStatusEventTrigger } from '@/lib/orderStatus';
import { serverError } from '@/lib/logger';
import { notify, orderTeam, orderLink, statusLabel } from '@/lib/notifications';

async function GET_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { error } = await requirePermission(request, 'view_orders');
    if (error) return error;
    await connectDB();
    const order = await Order.findById(params.id)
      .populate('event', 'eventDate eventType guestCount status eventLocation')
      .populate('assignees.user', 'name email')
      .lean();
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const quotes = await Quote.find({ order: params.id })
      .sort({ versionNumber: 1 })
      .lean();

    const invoices = await Invoice.find({ order: params.id })
      .select('type invoiceNumber issuedDate status totalTTC stampDuty creditedAmount balanceDue creditedInvoiceNumber')
      .sort({ issuedDate: 1 })
      .lean();
    const payableTotal = await getOrderPayableTotal(order);

    return NextResponse.json({ order, quotes, invoices, payableTotal });
  } catch (err: unknown) {
    return serverError(err);
  }
}

async function PATCH_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { auth, error } = await requirePermission(request, 'edit_orders');
    if (error) return error;
    await connectDB();
    const body = await request.json();

    const order = await Order.findById(params.id).populate('event');
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const prevStatus = order.status;
    const prevTeam = new Set(orderTeam(order));
    // Snapshot of the fields the team cares about, to tell them what changed.
    const WATCHED = ['eventDate', 'startTime', 'guestCount', 'eventLocation'];
    const prevWatched = Object.fromEntries(WATCHED.map(k => [k, order[k] instanceof Date ? order[k].getTime() : (order[k] ?? '')]));
    const allowed = [
      'clientName', 'clientEmail', 'clientPhone', 'eventDate', 'eventType',
      'guestCount', 'tableCount', 'startTime', 'eventLocation', 'notes', 'externalNotes', 'status',
      'lineGroups', 'staffAssignments', 'discountAmount', 'assignees',
    ];
    for (const key of allowed) {
      if (body[key] !== undefined) order[key] = body[key];
    }
    // Pack lines get their unitPrice / subItems re-derived from their kept items, so
    // removing an included item always reprices the line and the order total below.
    if (Array.isArray(body.lineGroups)) order.lineGroups = normalizeLineGroups(body.lineGroups);
    // When the assignee team is written, clear the legacy single-manager field so the two never drift.
    if (body.assignees !== undefined) order.assignedManager = null;

    // Keep the linked Event (the snapshot the calendar reads from) in sync with the order.
    // Without this, editing the order's date leaves the event on its old day in the calendar.
    if (order.event && typeof order.event === 'object' && '_id' in order.event) {
      const eventSyncFields = ['eventDate', 'eventType', 'guestCount', 'tableCount', 'startTime', 'eventLocation', 'notes'];
      let eventChanged = false;
      for (const key of eventSyncFields) {
        if (body[key] !== undefined) {
          order.event[key] = body[key];
          eventChanged = true;
        }
      }
      if (eventChanged) await order.event.save();
    }

    // If status changed and new status has triggerEvent, create event if not yet created
    if (body.status && body.status !== prevStatus) {
      await applyStatusEventTrigger(order, body.status);
    }

    const _iTotal = lineGroupsTotal(order.lineGroups);
    const _sTotal = (order.staffAssignments || []).reduce(
      (s, sa) => s + Number(sa.count) * Number(sa.hours) * Number(sa.ratePerHour), 0
    );
    order.totalAmount = +(_iTotal + _sTotal + (order.travelPrice || 0) - (order.discountAmount || 0)).toFixed(2);

    await order.save();

    // When an order is marked Completed, automatically record a cash payment for any
    // outstanding balance so the order lands fully-paid.
    if (body.status === 'completed' && prevStatus !== 'completed') {
      const existingPayments = await Payment.find({ order: params.id }).lean();
      const paidTotal = +existingPayments.reduce((s, p) => s + p.amount, 0).toFixed(2);
      const remaining = +((await getOrderPayableTotal(order)) - paidTotal).toFixed(2);
      if (remaining > 0) {
        const payment = await Payment.create({
          order: params.id,
          amount: remaining,
          paymentDate: new Date(),
          paymentMethod: 'cash',
          notes: 'Auto-recorded on order completion',
        });
        await syncPaymentState(order);
        await logActivity({
          action: 'payment_created',
          entityType: 'payment',
          entityId: payment._id.toString(),
          entityLabel: `${remaining}€ – ${order.clientName}`,
          performedBy: auth.userId,
          metadata: { orderId: params.id, amount: remaining, method: 'cash', auto: true },
        });
      }
    }

    if (body.status && body.status !== prevStatus) {
      const userId = auth.userId;
      await logActivity({
        action: 'order_status_changed',
        entityType: 'order',
        entityId: params.id,
        entityLabel: `${order.clientName} – ${body.status}`,
        performedBy: userId,
        metadata: { previousStatus: prevStatus, newStatus: body.status },
      });
    }

    await notifyOrderChanges(order, { prevTeam, prevWatched, prevStatus, actorId: auth.userId });

    // Reuse the doc we just saved; populate its refs instead of re-fetching the order.
    await order.populate('event', 'eventDate eventType guestCount status eventLocation');
    await order.populate('assignees.user', 'name email');
    const quotes = await Quote.find({ order: params.id }).sort({ versionNumber: 1 }).lean();
    return NextResponse.json({ order: order.toObject(), quotes });
  } catch (err: unknown) {
    return serverError(err);
  }
}

async function DELETE_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { error } = await requirePermission(request, 'delete_orders');
    if (error) return error;
    await connectDB();
    // Invoices must be kept for 10 years (CGI art. 211): an invoiced order cannot be deleted.
    if (await Invoice.exists({ order: params.id })) {
      return NextResponse.json(
        { error: 'has_invoices', message: 'This order has invoices and cannot be deleted.' },
        { status: 409 },
      );
    }
    await Quote.deleteMany({ order: params.id });
    await Order.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
export const PATCH = withTenant(PATCH_);
export const DELETE = withTenant(DELETE_);

/** Tells the order team about assignment, detail and status changes. */
async function notifyOrderChanges(order, { prevTeam, prevWatched, prevStatus, actorId }) {
  const base = { client: order.clientName, date: order.eventDate };
  const link = orderLink(order);
  const team = orderTeam(order);

  // Newly added team members, each with their role.
  for (const a of order.assignees || []) {
    const id = String(a.user?._id || a.user);
    if (!a.user || prevTeam.has(id)) continue;
    await notify({ recipients: [id], group: 'event', type: 'event_assigned', params: { ...base, role: a.role }, link, actorId });
  }

  // Everyone already on the team before this edit.
  const existing = team.filter(id => prevTeam.has(id));
  const changes = Object.keys(prevWatched).filter(k => {
    const now = order[k] instanceof Date ? order[k].getTime() : (order[k] ?? '');
    return String(now) !== String(prevWatched[k]);
  });
  if (changes.length) {
    await notify({
      recipients: existing, group: 'event', type: 'event_updated',
      params: { ...base, changes, ...(changes.includes('guestCount') ? { guestCount: order.guestCount } : {}) },
      link, actorId,
    });
  }
  if (order.status !== prevStatus) {
    await notify({ recipients: existing, group: 'event', type: 'event_status', params: { ...base, status: await statusLabel(order.status) }, link, actorId });
  }
}
