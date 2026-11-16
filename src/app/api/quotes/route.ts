// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Quote, Order, CompanySettings } from '@/lib/models';
import { logActivity } from '@/lib/activityLogger';
import { requirePermission } from '@/lib/requireAuth';
import { itemUnitPrice, round2 } from '@/lib/pricing';
import { serverError } from '@/lib/logger';

// POST /api/quotes — snapshot the order's current items/staff into a new quote version
async function POST_(request: NextRequest) {
  try {
    const { auth, error } = await requirePermission(request, 'create_quotes');
    if (error) return error;
    await connectDB();
    const body = await request.json();

    if (!body.orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const order = await Order.findById(body.orderId);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // Find current active quote to determine next version and inherit pricing defaults
    const prevActive = await Quote.findOne({ order: body.orderId, isActive: true });

    // Deactivate previous active quote
    if (prevActive) {
      await Quote.findByIdAndUpdate(prevActive._id, { $set: { isActive: false } });
    }

    const company = await CompanySettings.findOne({}).select('vatRegime defaultVatRate').lean();
    const defaultRate = company?.vatRegime === 'auto_entrepreneur' ? 0 : (company?.defaultVatRate ?? 0.2);

    const nextVersion = prevActive ? prevActive.versionNumber + 1 : 1;

    // Flatten order's lineGroups into snapshot lineItems
    const lineItems = (order.lineGroups || []).flatMap(g =>
      (g.items || []).map(item => ({
        groupLabel: g.label || '',
        name: item.name || '',
        category: item.category || '',
        quantity: Number(g.count) || 1,
        basePrice: round2(Number(item.unitPrice) || 0),
        // Effective price (base + options) so quantity × unitPrice === lineTotal holds.
        unitPrice: round2(itemUnitPrice(item)),
        lineTotal: round2((Number(g.count) || 1) * itemUnitPrice(item)),
        notes: item.notes || '',
        subItems: (item.subItems || []).map(s => ({ name: s.name })),
        selectedOptions: (item.selectedOptions || []).map(o => ({
          _optionId: o._optionId || '',
          name: o.name,
          price: Number(o.price) || 0,
        })),
        catalogItem: item.catalogItem || undefined,
      }))
    );

    // Optional separate VAT rate for services (staff + travel), e.g. meals at 10% and
    // services at 20%. null/'' = same as the quote's main rate.
    const rawServiceRate = body.serviceVatRate !== undefined ? body.serviceVatRate : (prevActive?.travelVatRate ?? null);
    const serviceVatRate = rawServiceRate === null || rawServiceRate === '' ? null : Number(rawServiceRate);

    // Map order's staffAssignments with computed lineTotals
    const staffAssignments = (order.staffAssignments || []).map(sa => ({
      role: sa.role,
      count: Number(sa.count) || 1,
      hours: Number(sa.hours) || 0,
      ratePerHour: Number(sa.ratePerHour) || 0,
      lineTotal: +((Number(sa.count) || 1) * (Number(sa.hours) || 0) * (Number(sa.ratePerHour) || 0)).toFixed(2),
      notes: sa.notes || '',
      vatRate: serviceVatRate,
    }));

    const quote = new Quote({
      order: body.orderId,
      versionNumber: nextVersion,
      isActive: true,
      validUntil: body.validUntil ? new Date(body.validUntil) : (prevActive?.validUntil ?? undefined),
      lineItems,
      staffAssignments,
      travelFee: order.travelPrice || 0,
      travelRegion: order.travelRegion || '',
      travelVatRate: serviceVatRate,
      discountAmount: order.discountAmount || 0,
      taxRate: body.taxRate !== undefined ? Number(body.taxRate) : (prevActive?.taxRate ?? defaultRate),
      clientNotes: body.clientNotes ?? (prevActive?.clientNotes ?? ''),
      internalNotes: body.internalNotes ?? (prevActive?.internalNotes ?? ''),
    });

    await quote.save();

    const userId = auth.userId;
    await logActivity({
      action: 'quote_generated',
      entityType: 'quote',
      entityId: quote._id.toString(),
      entityLabel: `Quote v${nextVersion} – ${order.clientName}`,
      performedBy: userId,
      metadata: { orderId: body.orderId, versionNumber: nextVersion },
    });

    return NextResponse.json({ quote }, { status: 201 });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const POST = withTenant(POST_);
