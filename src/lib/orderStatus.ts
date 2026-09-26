// @ts-nocheck
// Side effects of moving an order into a new status. Shared by the order PATCH route
// and the payments route (which auto-confirms on the first payment) so the two can't drift.
import { Client, Event, OrderStatusConfig, FlowTemplate } from '@/lib/models';

// Statuses that must never be overwritten by an automatic transition — they are either
// already past confirmation or a deliberate end state.
const TERMINAL_STATUSES = ['confirmed', 'completed', 'cancelled'];

export function canAutoConfirm(order) {
  return !TERMINAL_STATUSES.includes(order.status);
}

async function ensureClient(order) {
  let client = await Client.findOne({ phone: order.clientPhone });
  if (!client) {
    client = await Client.create({
      name: order.clientName,
      email: order.clientEmail || '',
      phone: order.clientPhone,
    });
  }
  return client._id;
}

// If the status the order just moved into is configured with triggerEvent, create the
// calendar Event (with its flow instance) unless the order already has one.
// Mutates order.event; the caller is responsible for saving the order.
export async function applyStatusEventTrigger(order, statusName) {
  const statusConfig = await OrderStatusConfig.findOne({ name: statusName });
  if (!statusConfig?.triggerEvent || order.event) return;

  const template = await FlowTemplate.findOne({ eventTypeKey: order.eventType, isActive: true }).lean();
  const instanceSteps = template?.steps?.length
    ? template.steps
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s, i) => ({ label: s.label, description: s.description || '', sortOrder: i, status: 'pending' }))
    : [];

  const event = await Event.create({
    client: await ensureClient(order),
    eventDate: order.eventDate,
    eventType: order.eventType,
    guestCount: order.guestCount,
    tableCount: order.tableCount,
    startTime: order.startTime,
    eventLocation: order.eventLocation,
    notes: order.notes,
    status: 'confirmed',
    flowInstance: template
      ? { templateId: template._id, templateName: template.name, steps: instanceSteps }
      : { steps: [] },
  });
  order.event = event._id;
}
