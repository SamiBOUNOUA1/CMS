// @ts-nocheck
import mongoose, { Schema, models, model } from 'mongoose';
import { tenantPlugin } from '@/lib/tenantPlugin';
import { computeVatBreakdown, totalsFromBreakdown } from '@/lib/vat';
import { getTenantStore } from '@/lib/tenantContext';
import {
  CASE_STATUSES, CASE_PRIORITIES, CASE_CATEGORIES, CASE_BODY_MAX, CASE_SUBJECT_MAX,
} from '@/lib/supportCases';

// ── TRAVEL REGION CONFIG ──────────────────────────────────────────────────────
const travelRegionConfigSchema = new Schema(
  {
    label:       { type: String, required: true, trim: true },
    travelPrice: { type: Number, default: 0, min: 0 },
    isDefault:   { type: Boolean, default: false },
    isActive:    { type: Boolean, default: true },
    sortOrder:   { type: Number, default: 0 },
  },
  { timestamps: true }
);
travelRegionConfigSchema.plugin(tenantPlugin);
export const TravelRegionConfig = models.TravelRegionConfig || model('TravelRegionConfig', travelRegionConfigSchema);

// ── ORDER STATUS CONFIG ───────────────────────────────────────────────────────
const orderStatusConfigSchema = new Schema(
  {
    name:         { type: String, required: true, trim: true, lowercase: true },
    label:        { type: String, required: true, trim: true },
    color:        { type: String, default: '#5f6368', trim: true },
    triggerEvent: { type: Boolean, default: false },
    isSystem:     { type: Boolean, default: false },
    sortOrder:    { type: Number, default: 0 },
  },
  { timestamps: true }
);
orderStatusConfigSchema.plugin(tenantPlugin);
orderStatusConfigSchema.index({ tenantId: 1, name: 1 }, { unique: true });
export const OrderStatusConfig = models.OrderStatusConfig || model('OrderStatusConfig', orderStatusConfigSchema);

// ── EVENT TYPE CONFIG ─────────────────────────────────────────────────────────
const eventTypeConfigSchema = new Schema(
  {
    key: { type: String, required: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    countMode: { type: String, enum: ['persons', 'tables'], default: 'persons' },
    tableCapacity: { type: Number, default: 10, min: 1 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);
eventTypeConfigSchema.plugin(tenantPlugin);
eventTypeConfigSchema.index({ tenantId: 1, key: 1 }, { unique: true });
export const EventTypeConfig = models.EventTypeConfig || model('EventTypeConfig', eventTypeConfigSchema);

// ── CUSTOMER TYPE CONFIG ──────────────────────────────────────────────────────
const customerTypeConfigSchema = new Schema(
  {
    key:       { type: String, required: true, trim: true, lowercase: true },
    label:     { type: String, required: true, trim: true },
    isActive:  { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);
customerTypeConfigSchema.plugin(tenantPlugin);
customerTypeConfigSchema.index({ tenantId: 1, key: 1 }, { unique: true });
export const CustomerTypeConfig = models.CustomerTypeConfig || model('CustomerTypeConfig', customerTypeConfigSchema);

// ── STAFF ROLE CONFIG ─────────────────────────────────────────────────────────
const staffRoleConfigSchema = new Schema(
  {
    key:       { type: String, required: true, trim: true },
    label:     { type: String, required: true, trim: true },
    isActive:  { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);
staffRoleConfigSchema.plugin(tenantPlugin);
staffRoleConfigSchema.index({ tenantId: 1, key: 1 }, { unique: true });
export const StaffRoleConfig = models.StaffRoleConfig || model('StaffRoleConfig', staffRoleConfigSchema);

// ── ROLE ──────────────────────────────────────────────────────────────────────
const roleSchema = new Schema(
  {
    name:      { type: String, required: true, trim: true, lowercase: true },
    label:     { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
    isSystem:  { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);
roleSchema.plugin(tenantPlugin);
roleSchema.index({ tenantId: 1, name: 1 }, { unique: true });
export const Role = models.Role || model('Role', roleSchema);

// ── ROLE PERMISSIONS ──────────────────────────────────────────────────────────
const rolePermissionsSchema = new Schema(
  {
    role: { type: String, required: true },
    permissions: { type: Map, of: Boolean, default: {} },
  },
  { timestamps: true }
);
rolePermissionsSchema.plugin(tenantPlugin);
rolePermissionsSchema.index({ tenantId: 1, role: 1 }, { unique: true });
export const RolePermissions = models.RolePermissions || model('RolePermissions', rolePermissionsSchema);

// ── USER ──────────────────────────────────────────────────────────────────────
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, default: 'viewer' },
    isActive: { type: Boolean, default: true },
    // Bumped to end every open session of this user (see lib/sessionGuard.ts).
    sessionVersion: { type: Number, default: 0 },
    preferredLanguage: { type: String, enum: ['en', 'fr', 'ar'], default: 'en' },
    // Notification groups this user also wants by email (see lib/notifications.ts).
    notificationEmail: { type: [{ type: String, enum: ['event', 'task', 'sales', 'stock', 'system'] }], default: [] },
    // Two-factor auth (TOTP). Secrets are encrypted (lib/mfa.ts); never selected by default.
    mfaEnabled:       { type: Boolean, default: false },
    mfaSecret:        { type: String, select: false },
    mfaPendingSecret: { type: String, select: false },
    mfaRecoveryCodes: { type: [String], select: false },
    mfaLastStep:      { type: Number, select: false },
  },
  { timestamps: true }
);
userSchema.plugin(tenantPlugin);
export const User = models.User || model('User', userSchema);

// ── CATEGORY ──────────────────────────────────────────────────────────────────
const categorySchema = new Schema(
  { name: { type: String, required: true, trim: true } },
  { timestamps: true }
);
categorySchema.plugin(tenantPlugin);
categorySchema.index({ tenantId: 1, name: 1 }, { unique: true });
export const Category = models.Category || model('Category', categorySchema);

// ── PRODUCT ───────────────────────────────────────────────────────────────────
const subItemSchema = new Schema({
  name: { type: String, required: true, trim: true },
});

// Priced supplement a client can add to this product, e.g. "Dish decoration" +10.
// `price` is PER UNIT — it is added to the line's unit price and therefore multiplied
// by the order group's count. min: 0 because the quote's lineItemSchema declares
// min: 0 on unitPrice/lineTotal, which a negative option could otherwise violate.
const productOptionSchema = new Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, default: 0, min: 0 },
});

// Priced component of a `pack` product. The pack's defaultPrice is derived by the
// products API: sum of packItems prices + margin (see packPrice in lib/pricing.ts).
const productPackItemSchema = new Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, default: 0, min: 0 },
});

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    shortDescription: { type: String, trim: true, default: '' },
    productType: { type: String, enum: ['simple', 'bundle', 'pack'], default: 'simple' },
    defaultPrice: { type: Number, default: 0, min: 0 },
    unit: { type: String, default: 'item', trim: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    subItems: [subItemSchema],
    packingItems: [subItemSchema],
    options: [productOptionSchema],
    // Pack products only.
    packItems: [productPackItemSchema],
    marginType: { type: String, enum: ['fixed', 'percent'], default: 'fixed' },
    marginValue: { type: Number, default: 0, min: 0 },
    linkedRecipe: { type: Schema.Types.ObjectId, ref: 'KitchenRecipe', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
productSchema.plugin(tenantPlugin);
productSchema.index({ tenantId: 1, name: 1 }, { unique: true });
export const Product = models.Product || model('Product', productSchema);

// ── CLIENT ────────────────────────────────────────────────────────────────────
const clientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    billingAddress: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: 'FR' },
    },
    notes: String,
    customerType: { type: String, trim: true, default: '' },
    leadSource: { type: String, trim: true, default: '' },
    // Legal identity used on invoices (Moroccan CGI art. 145: a business buyer's ICE is mandatory).
    clientKind: { type: String, enum: ['individual', 'company'], default: 'individual' },
    legalName:  { type: String, trim: true, default: '' },
    ice:        { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);
clientSchema.index({ tenantId: 1, name: 1 });
clientSchema.index({ tenantId: 1, customerType: 1, name: 1 });
clientSchema.plugin(tenantPlugin);
export const Client = models.Client || model('Client', clientSchema);

// ── VENUE ─────────────────────────────────────────────────────────────────────
const venueSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { street: String, city: String, postalCode: String, country: { type: String, default: 'FR' } },
    capacity: { type: Number, min: 1 },
    notes: String,
  },
  { timestamps: true }
);
venueSchema.plugin(tenantPlugin);
export const Venue = models.Venue || model('Venue', venueSchema);

// ── CATALOG ITEM ──────────────────────────────────────────────────────────────
const catalogItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: ['food', 'beverage', 'equipment', 'service', 'other'], required: true },
    description: String,
    unitPrice: { type: Number, required: true, min: 0 },
    unit: { type: String, default: 'item' },
    dietaryFlags: [{ type: String, enum: ['vegan', 'vegetarian', 'gluten-free', 'halal', 'kosher', 'nut-free'] }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
catalogItemSchema.plugin(tenantPlugin);
export const CatalogItem = models.CatalogItem || model('CatalogItem', catalogItemSchema);

// ── MENU PACKAGE ──────────────────────────────────────────────────────────────
const menuPackageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    basePricePerPerson: { type: Number, required: true, min: 0 },
    minGuests: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
menuPackageSchema.plugin(tenantPlugin);
export const MenuPackage = models.MenuPackage || model('MenuPackage', menuPackageSchema);

// ── FLOW INSTANCE STEP (embedded in Event and Order) ─────────────────────────
const flowInstanceStepSchema = new Schema({
  label:       { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  sortOrder:   { type: Number, default: 0 },
  status:      { type: String, enum: ['pending', 'in_progress', 'completed', 'skipped'], default: 'pending' },
}, { _id: true });

// ── EVENT ─────────────────────────────────────────────────────────────────────
const eventSchema = new Schema(
  {
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    venue: { type: Schema.Types.ObjectId, ref: 'Venue' },
    eventLocation: { type: String, default: '', trim: true }, // free-text location, synced from the order
    eventDate: { type: Date, required: true },
    eventType: {
      type: String,
      required: true,
      validate: {
        validator: async function (value: string) {
          const EventTypeConfigModel = models.EventTypeConfig || model('EventTypeConfig', eventTypeConfigSchema);
          const exists = await EventTypeConfigModel.exists({ key: value, isActive: true });
          return !!exists;
        },
        message: (props: { value: string }) => `\`${props.value}\` is not a valid event type`,
      },
    },
    guestCount: { type: Number, required: true, min: 1 },
    tableCount: { type: Number, min: 1 },
    startTime: String,
    endTime: String,
    notes: String,
    status: {
      type: String,
      enum: ['inquiry', 'confirmed', 'completed', 'cancelled'],
      default: 'inquiry',
    },
    flowInstance: {
      templateId:   { type: Schema.Types.ObjectId, ref: 'FlowTemplate' },
      templateName: { type: String, default: '' },
      steps:        [flowInstanceStepSchema],
    },
  },
  { timestamps: true }
);
eventSchema.index({ tenantId: 1, eventDate: 1 });
eventSchema.index({ client: 1 });
eventSchema.plugin(tenantPlugin);
export const Event = models.Event || model('Event', eventSchema);

// ── STAFF ASSIGNMENT (shared by Order and Quote) ──────────────────────────────
const staffAssignmentSchema = new Schema({
  role: { type: String, required: true },
  count: { type: Number, default: 1, min: 1 },
  hours: { type: Number, required: true, min: 0 },
  ratePerHour: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 },
  notes: String,
  vatRate: { type: Number, default: null }, // per-line VAT override (quotes); null = quote default
});

// ── FLOW TEMPLATE ─────────────────────────────────────────────────────────────
const flowTemplateStepSchema = new Schema({
  label:       { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  sortOrder:   { type: Number, default: 0 },
}, { _id: true });

const flowTemplateSchema = new Schema({
  eventTypeKey: { type: String, required: true, trim: true, lowercase: true },
  name:         { type: String, required: true, trim: true },
  steps:        [flowTemplateStepSchema],
  isActive:     { type: Boolean, default: true },
  sortOrder:    { type: Number, default: 0 },
}, { timestamps: true });

flowTemplateSchema.plugin(tenantPlugin);
export const FlowTemplate = models.FlowTemplate || model('FlowTemplate', flowTemplateSchema);

// ── ORDER LINE GROUPS (editable working state stored on Order) ─────────────────
// Packing checklist entries ride on each line item. They are snapshotted from
// Product.packingItems when the dish is added to the order (see LineItemsStep)
// and each row has its own _id so the PATCH /packing-items route can toggle a
// single checkbox without a wholesale re-save of the order.
const orderPackingItemSchema = new Schema({
  name: { type: String, required: true, trim: true },
  checked: { type: Boolean, default: false },
}, { _id: true });

const orderLineGroupItemSchema = new Schema({
  catalogItem: { type: Schema.Types.ObjectId, ref: 'CatalogItem' },
  _productId: { type: String, default: '' },
  name: String,
  unitPrice: { type: Number, default: 0 },
  category: String,
  notes: String,
  subItems: [{ name: String }],
  packingItems: [orderPackingItemSchema],
  // Supplements ticked on this line, snapshotted by value from Product.options.
  // `_optionId` is an advisory back-link used only to keep the wizard's checkboxes
  // matched when an option is renamed in the catalog.
  selectedOptions: [{
    _optionId: { type: String, default: '' },
    name: { type: String, required: true },
    price: { type: Number, default: 0 },
  }],
  // Pack lines: included items snapshotted by value from Product.packItems. An item
  // taken out for this order keeps its row with removed: true so it can be restored.
  // `packMargin` is the margin AMOUNT fixed when the pack was added; unitPrice and
  // subItems are re-derived from these by normalizePackItem (lib/pricing.ts).
  isPack: { type: Boolean, default: false },
  packMargin: { type: Number, default: 0 },
  packItems: [{
    _id: false,
    _packItemId: { type: String, default: '' },
    name: { type: String, required: true },
    price: { type: Number, default: 0 },
    removed: { type: Boolean, default: false },
  }],
}, { _id: false });

const orderLineGroupSchema = new Schema({
  label: { type: String, default: '' },
  count: { type: Number, default: 1 },
  items: [orderLineGroupItemSchema],
});

// ── EVENT MATERIALS (checklist of inventory items used at the event) ───────────
const orderMaterialSchema = new Schema({
  inventoryItem: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  quantity:      { type: Number, default: 1, min: 0 },
  checked:       { type: Boolean, default: false },
  checkedBy:     { type: Schema.Types.ObjectId, ref: 'User', default: null },
  checkedAt:     { type: Date, default: null },
  // "Missing" warning flag — set when a material is absent/short at verification time.
  // Mutually exclusive with `checked` (enforced in the materials PATCH route).
  missing:       { type: Boolean, default: false },
  missingBy:     { type: Schema.Types.ObjectId, ref: 'User', default: null },
  missingAt:     { type: Date, default: null },
}, { _id: true });

// ── EVENT ASSIGNEES (team members assigned to an order, each with a responsibility) ─
// Responsibility labels shared by the assignment UI and any display badges.
export const ASSIGNEE_ROLES = ['manager', 'materials', 'kitchen', 'staff', 'logistics', 'other'];
const assigneeSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, default: 'manager' }, // responsibility label, see ASSIGNEE_ROLES
}, { _id: false });

// ── ORDER ─────────────────────────────────────────────────────────────────────
const orderSchema = new Schema(
  {
    clientName:  { type: String, required: true, trim: true },
    clientEmail: { type: String, lowercase: true, trim: true },
    clientPhone: { type: String, required: true, trim: true },
    eventDate:   { type: Date, required: true },
    eventType: {
      type: String,
      required: true,
      validate: {
        validator: async function (value: string) {
          const EventTypeConfigModel = models.EventTypeConfig || model('EventTypeConfig', eventTypeConfigSchema);
          const exists = await EventTypeConfigModel.exists({ key: value, isActive: true });
          return !!exists;
        },
        message: (props: { value: string }) => `\`${props.value}\` is not a valid event type`,
      },
    },
    guestCount:  { type: Number, required: true, min: 1 },
    tableCount:  { type: Number, min: 1 },
    startTime:   String,
    eventLocation: { type: String, default: '', trim: true }, // free-text event location; copied to the linked Event
    notes:       String,
    externalNotes: { type: String, default: '' }, // client-facing; shown on quote & receipt
    status:        { type: String, required: true, default: 'new' },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partially-paid', 'fully-paid'],
      default: 'unpaid',
    },
    event:           { type: Schema.Types.ObjectId, ref: 'Event' },
    createdBy:       { type: Schema.Types.ObjectId, ref: 'User' },
    assignees:       [assigneeSchema],
    assignedManager: { type: Schema.Types.ObjectId, ref: 'User' }, // @deprecated — migrated to assignees
    travelRegion:     { type: String, default: '' },
    travelPrice:      { type: Number, default: 0 },
    discountAmount:   { type: Number, default: 0 },
    lineGroups:       [orderLineGroupSchema],
    staffAssignments: [staffAssignmentSchema],
    materials:        [orderMaterialSchema],
    totalAmount:      { type: Number, default: 0 },
    flowInstance: {
      templateId:   { type: Schema.Types.ObjectId, ref: 'FlowTemplate' },
      templateName: { type: String, default: '' },
      steps:        [flowInstanceStepSchema],
    },
  },
  { timestamps: true }
);

// Every query is scoped by tenantId (tenantPlugin), so list/range indexes lead with it.
orderSchema.index({ tenantId: 1, createdAt: -1 });
orderSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
orderSchema.index({ tenantId: 1, eventDate: 1 });
orderSchema.index({ tenantId: 1, paymentStatus: 1, eventDate: 1 });
orderSchema.index({ tenantId: 1, clientPhone: 1 });
orderSchema.index({ event: 1 });
orderSchema.index({ 'assignees.user': 1 });
orderSchema.index({ assignedManager: 1 }, { sparse: true });
orderSchema.plugin(tenantPlugin);
export const Order = models.Order || model('Order', orderSchema);

// ── QUOTE ─────────────────────────────────────────────────────────────────────
const lineItemSchema = new Schema({
  catalogItem: { type: Schema.Types.ObjectId, ref: 'CatalogItem' },
  name: { type: String, required: true },
  groupLabel: { type: String, default: '' },
  category: String,
  quantity: { type: Number, required: true, min: 0 },
  basePrice: { type: Number, default: 0, min: 0 },
  // Effective price: basePrice + selectedOptions. Kept effective (not base) so the
  // quantity × unitPrice === lineTotal invariant holds for this snapshot document.
  unitPrice: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 },
  notes: String,
  subItems: [{ name: { type: String, required: true } }],
  selectedOptions: [{
    _optionId: { type: String, default: '' },
    name: { type: String, required: true },
    price: { type: Number, default: 0 },
  }],
  vatRate: { type: Number, default: null }, // per-line VAT override; null = quote taxRate
});

const quoteSchema = new Schema(
  {
    order:         { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    versionNumber: { type: Number, default: 1 },
    isActive:      { type: Boolean, default: true },
    validUntil:    Date,
    lineItems:     [lineItemSchema],
    staffAssignments: [staffAssignmentSchema],
    travelFee:     { type: Number, default: 0 },
    travelRegion:  { type: String, default: '' },
    subtotal:      { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxRate:       { type: Number, default: 0.2 },
    travelVatRate: { type: Number, default: null }, // null = quote taxRate
    taxAmount:     { type: Number, default: 0 },
    total:         { type: Number, default: 0 },
    internalNotes: String,
    clientNotes:   String,
  },
  { timestamps: true }
);

/** Lines of a quote as {totalHT, vatRate}, resolving per-line overrides against the quote rate. */
export function quoteVatLines(q) {
  const rateOf = (r) => (r === null || r === undefined ? Number(q.taxRate) || 0 : Number(r));
  return [
    ...(q.lineItems || []).map(li => ({ totalHT: li.lineTotal || 0, vatRate: rateOf(li.vatRate) })),
    ...(q.staffAssignments || []).map(sa => ({ totalHT: sa.lineTotal || 0, vatRate: rateOf(sa.vatRate) })),
    ...((q.travelFee || 0) > 0 ? [{ totalHT: q.travelFee, vatRate: rateOf(q.travelVatRate) }] : []),
  ];
}

quoteSchema.pre('save', function (next) {
  const itemsTotal = this.lineItems.reduce((s, li) => s + li.lineTotal, 0);
  const staffTotal = this.staffAssignments.reduce((s, sa) => s + sa.lineTotal, 0);
  const travelTotal = this.travelFee || 0;
  this.subtotal = +(itemsTotal + staffTotal + travelTotal - this.discountAmount).toFixed(2);
  // VAT per rate (the discount is spread proportionally) — identical to subtotal × taxRate
  // when every line uses the quote rate.
  const { totalVAT } = totalsFromBreakdown(computeVatBreakdown(quoteVatLines(this), this.discountAmount));
  this.taxAmount = totalVAT;
  this.total = +(this.subtotal + this.taxAmount).toFixed(2);
  next();
});

quoteSchema.index({ order: 1, isActive: 1 });
quoteSchema.plugin(tenantPlugin);
export const Quote = models.Quote || model('Quote', quoteSchema);

// ── INVOICE (facture / avoir) ─────────────────────────────────────────────────
// Legally binding, IMMUTABLE snapshot (Moroccan CGI art. 145). Once issued only
// `status`, `amountPaid`, `balanceDue` and `creditedAmount` may change; corrections
// are made by issuing a credit note (type 'credit_note') that references the invoice.
// Never deleted (10-year retention, CGI art. 211) — there is no DELETE route.
const invoicePartySchema = new Schema({
  name:       { type: String, default: '' },  // trade / display name
  legalName:  { type: String, default: '' },
  legalForm:  { type: String, default: '' },
  shareCapital: { type: String, default: '' },
  kind:       { type: String, default: 'company' }, // buyer: individual | company
  address:    { type: String, default: '' },
  phone:      { type: String, default: '' },
  email:      { type: String, default: '' },
  ice:        { type: String, default: '' },
  identifiantFiscal:   { type: String, default: '' },
  taxeProfessionnelle: { type: String, default: '' },
  rcNumber:   { type: String, default: '' },
  rcCourt:    { type: String, default: '' },
  cnss:       { type: String, default: '' },
  bankName:   { type: String, default: '' },
  rib:        { type: String, default: '' },
  vatRegime:  { type: String, default: 'standard' },
  autoEntrepreneurId: { type: String, default: '' },
  logoUrl:    { type: String, default: '' },
}, { _id: false });

const invoiceLineSchema = new Schema({
  label:       { type: String, required: true },
  detail:      { type: String, default: '' },
  quantity:    { type: Number, default: 1 },
  unitPriceHT: { type: Number, default: 0 },
  totalHT:     { type: Number, default: 0 },
  vatRate:     { type: Number, default: 0 },
}, { _id: false });

const invoiceSchema = new Schema(
  {
    type:          { type: String, enum: ['invoice', 'credit_note'], default: 'invoice' },
    invoiceNumber: { type: String, required: true },
    order:         { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    quote:         { type: Schema.Types.ObjectId, ref: 'Quote', default: null },
    creditedInvoice: { type: Schema.Types.ObjectId, ref: 'Invoice', default: null }, // credit notes only
    creditedInvoiceNumber: { type: String, default: '' },
    creditReason:  { type: String, default: '' },
    issuedDate:    { type: Date, required: true },
    serviceDate:   { type: Date, default: null },
    dueDate:       { type: Date, default: null },
    seller:        { type: invoicePartySchema, required: true },
    buyer:         { type: invoicePartySchema, required: true },
    currency:      { type: String, default: 'MAD' },
    lines:         [invoiceLineSchema],
    discountHT:    { type: Number, default: 0 },
    vatBreakdown:  [{ _id: false, rate: Number, base: Number, amount: Number }],
    totalHT:       { type: Number, default: 0 },
    totalVAT:      { type: Number, default: 0 },
    stampDuty:     { type: Number, default: 0 },
    totalTTC:      { type: Number, default: 0 },
    amountInWords: { type: String, default: '' },
    deposits:      [{ _id: false, payment: { type: Schema.Types.ObjectId, ref: 'Payment' }, date: Date, method: String, amount: Number }],
    amountPaid:    { type: Number, default: 0 },
    balanceDue:    { type: Number, default: 0 },
    creditedAmount: { type: Number, default: 0 }, // sum of credit notes issued against this invoice
    paymentMethod: { type: String, default: '' },
    paymentTerms:  { type: String, default: '' },
    latePenaltyText: { type: String, default: '' },
    legalMentions: [{ type: String }],
    footerText:    { type: String, default: '' },
    status: {
      type: String,
      enum: ['issued', 'partially_paid', 'paid', 'cancelled'],
      default: 'issued',
    },
    contentHash:   { type: String, default: '' },
    issuedBy:      { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Fields that may still change after issue; everything else is frozen.
export const INVOICE_MUTABLE_FIELDS = ['status', 'amountPaid', 'balanceDue', 'creditedAmount', 'updatedAt'];

invoiceSchema.pre('save', function (next) {
  if (this.isNew) return next();
  const illegal = this.modifiedPaths().filter(
    p => !INVOICE_MUTABLE_FIELDS.some(f => p === f || p.startsWith(f + '.'))
  );
  if (illegal.length) return next(new Error(`Issued invoices are immutable (attempted: ${illegal.join(', ')})`));
  next();
});

function guardInvoiceUpdate(this: mongoose.Query<unknown, unknown>) {
  const update = this.getUpdate() || {};
  const keys = new Set<string>();
  for (const [k, v] of Object.entries(update)) {
    if (k.startsWith('$')) Object.keys(v || {}).forEach(x => keys.add(x));
    else keys.add(k);
  }
  const illegal = [...keys].filter(k => !INVOICE_MUTABLE_FIELDS.includes(k) && k !== 'createdAt');
  if (illegal.length) throw new Error(`Issued invoices are immutable (attempted: ${illegal.join(', ')})`);
}
invoiceSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], guardInvoiceUpdate);
// Tenant requests can never delete invoices. Only the platform operator, in system
// context, can (when permanently deleting a whole tenant — tenantProvisioning.ts).
invoiceSchema.pre(['deleteOne', 'deleteMany', 'findOneAndDelete', 'replaceOne', 'findOneAndReplace'], function () {
  const store = getTenantStore();
  if (store && 'system' in store) return;
  throw new Error('Invoices cannot be deleted or replaced');
});

invoiceSchema.plugin(tenantPlugin);
invoiceSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ tenantId: 1, issuedDate: -1 });
invoiceSchema.index({ tenantId: 1, order: 1 });
export const Invoice = models.Invoice || model('Invoice', invoiceSchema);

// ── TENANT COUNTER (gap-free document numbering per tenant) ───────────────────
const tenantCounterSchema = new Schema({
  key: { type: String, required: true }, // e.g. 'invoice-2026', 'credit_note-2026'
  seq: { type: Number, default: 0 },
});
tenantCounterSchema.plugin(tenantPlugin);
tenantCounterSchema.index({ tenantId: 1, key: 1 }, { unique: true });
export const TenantCounter = models.TenantCounter || model('TenantCounter', tenantCounterSchema);

// ── PAYMENT ───────────────────────────────────────────────────────────────────
const paymentSchema = new Schema(
  {
    order:         { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    amount:        { type: Number, required: true, min: 0 },
    paymentDate:   { type: Date, required: true, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'transfer', 'check', 'other'],
      default: 'cash',
    },
    reference: String,
    notes:     String,
  },
  { timestamps: true }
);
paymentSchema.index({ order: 1 });
paymentSchema.index({ tenantId: 1, paymentDate: -1 });
paymentSchema.plugin(tenantPlugin);
export const Payment = models.Payment || model('Payment', paymentSchema);

// ── MODULE CONFIG ─────────────────────────────────────────────────────────────
const moduleConfigSchema = new Schema(
  {
    moduleId:  { type: String, required: true, trim: true },
    isEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);
moduleConfigSchema.plugin(tenantPlugin);
moduleConfigSchema.index({ tenantId: 1, moduleId: 1 }, { unique: true });
export const ModuleConfig = models.ModuleConfig || model('ModuleConfig', moduleConfigSchema);

// ── INVENTORY CATEGORY ────────────────────────────────────────────────────────
const inventoryCategorySchema = new Schema(
  {
    name:  { type: String, required: true, trim: true },
    color: { type: String, default: '#5f6368', trim: true },
  },
  { timestamps: true }
);
inventoryCategorySchema.plugin(tenantPlugin);
inventoryCategorySchema.index({ tenantId: 1, name: 1 }, { unique: true });
export const InventoryCategory = models.InventoryCategory || model('InventoryCategory', inventoryCategorySchema);

// ── SUPPLIER ──────────────────────────────────────────────────────────────────
const supplierSchema = new Schema(
  {
    name:          { type: String, required: true, trim: true },
    email:         { type: String, trim: true, lowercase: true, default: '' },
    phone:         { type: String, trim: true, default: '' },
    supplierType:  { type: String, enum: ['goods', 'materials', 'services'], required: true },
    contactPerson: { type: String, trim: true, default: '' },
    address: {
      street:     { type: String, default: '' },
      city:       { type: String, default: '' },
      postalCode: { type: String, default: '' },
      state:      { type: String, default: '' },
      country:    { type: String, default: 'FR' },
    },
    notes:    { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
supplierSchema.plugin(tenantPlugin);
export const Supplier = models.Supplier || model('Supplier', supplierSchema);

// ── WAREHOUSE ─────────────────────────────────────────────────────────────────
const warehouseSchema = new Schema(
  {
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    address: {
      street:     { type: String, default: '' },
      city:       { type: String, default: '' },
      postalCode: { type: String, default: '' },
      state:      { type: String, default: '' },
      country:    { type: String, default: 'FR' },
    },
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    notes:    { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
warehouseSchema.plugin(tenantPlugin);
export const Warehouse = models.Warehouse || model('Warehouse', warehouseSchema);

// ── INVENTORY ITEM ────────────────────────────────────────────────────────────
const inventoryItemSchema = new Schema(
  {
    name:         { type: String, required: true, trim: true },
    category:     { type: Schema.Types.ObjectId, ref: 'InventoryCategory', default: null },
    unit:         { type: String, default: 'unit', trim: true },
    currentStock: { type: Number, default: 0, min: 0 },
    minStock:     { type: Number, default: 0, min: 0 },
    unitCost:     { type: Number, default: 0, min: 0 },
    supplier:     { type: Schema.Types.ObjectId, ref: 'Supplier', default: null },
    warehouse:    { type: Schema.Types.ObjectId, ref: 'Warehouse', default: null },
    notes:           { type: String, default: '' },
    imageUrl:        { type: String, default: '' },
    isActive:        { type: Boolean, default: true },
    laundryEligible: { type: Boolean, default: false },
  },
  { timestamps: true }
);
inventoryItemSchema.index({ tenantId: 1, isActive: 1, name: 1 });
inventoryItemSchema.index({ warehouse: 1 });
inventoryItemSchema.index({ category: 1 });
inventoryItemSchema.plugin(tenantPlugin);
export const InventoryItem = models.InventoryItem || model('InventoryItem', inventoryItemSchema);

// ── MATERIAL TEMPLATE (reusable set of inventory items for event materials lists) ─
// `mode: 'per_guest'` means quantity is per guest — or per table for table-mode event
// types — and is scaled by the order's guestCount / tableCount.
const materialTemplateItemSchema = new Schema({
  inventoryItem: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  mode:          { type: String, enum: ['fixed', 'per_guest'], default: 'fixed' },
  quantity:      { type: Number, default: 1, min: 0 },
}, { _id: false });

const materialTemplateSchema = new Schema(
  {
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    items:       [materialTemplateItemSchema],
  },
  { timestamps: true }
);
materialTemplateSchema.plugin(tenantPlugin);
materialTemplateSchema.index({ tenantId: 1, name: 1 });
export const MaterialTemplate = models.MaterialTemplate || model('MaterialTemplate', materialTemplateSchema);

// ── INVENTORY ADJUSTMENT ──────────────────────────────────────────────────────
const inventoryAdjustmentSchema = new Schema(
  {
    item:           { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    adjustmentType: { type: String, enum: ['purchase', 'usage', 'return', 'write-off', 'correction'], required: true },
    quantity:       { type: Number, required: true },
    date:           { type: Date, default: Date.now },
    notes:          { type: String, default: '' },
    performedBy:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);
inventoryAdjustmentSchema.plugin(tenantPlugin);
export const InventoryAdjustment = models.InventoryAdjustment || model('InventoryAdjustment', inventoryAdjustmentSchema);

// ── LAUNDRY BATCH ─────────────────────────────────────────────────────────────
const laundryBatchItemSchema = new Schema({
  inventoryItem:    { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  quantitySent:     { type: Number, required: true, min: 1 },
  quantityReturned: { type: Number, default: 0, min: 0 },
  quantityLost:     { type: Number, default: 0, min: 0 },
  quantityDamaged:  { type: Number, default: 0, min: 0 },
  notes:            { type: String, default: '' },
}, { _id: true });

const laundryBatchSchema = new Schema(
  {
    batchNumber:        { type: String, required: true, trim: true },
    date:               { type: Date, required: true, default: Date.now },
    order:              { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    cleaningSupplier:   { type: Schema.Types.ObjectId, ref: 'Supplier', default: null },
    status:             { type: String, enum: ['draft', 'sent', 'returned', 'completed'], default: 'draft' },
    notes:              { type: String, default: '' },
    items:              [laundryBatchItemSchema],
    createdBy:          { type: Schema.Types.ObjectId, ref: 'User', default: null },
    inventoryProcessed: { type: Boolean, default: false },
    sentAt:             { type: Date, default: null }, // when it moved to 'sent' (overdue notices)
  },
  { timestamps: true }
);
laundryBatchSchema.index({ order: 1 });
laundryBatchSchema.index({ tenantId: 1, status: 1, sentAt: 1 });
laundryBatchSchema.plugin(tenantPlugin);
laundryBatchSchema.index({ tenantId: 1, batchNumber: 1 }, { unique: true });
export const LaundryBatch = models.LaundryBatch || model('LaundryBatch', laundryBatchSchema);

// ── COMPANY SETTINGS ──────────────────────────────────────────────────────────
const companySettingsSchema = new Schema(
  {
    companyName: { type: String, default: '', trim: true },
    logoUrl:     { type: String, default: '', trim: true },
    phone:       { type: String, default: '', trim: true },
    email:       { type: String, default: '', trim: true },
    address: {
      street:     { type: String, default: '' },
      city:       { type: String, default: '' },
      postalCode: { type: String, default: '' },
      country:    { type: String, default: 'FR' },
    },
    currency:  { type: String, default: '€', trim: true },
    vatNumber: { type: String, default: '', trim: true },
    // ── Moroccan legal & tax mentions (CGI art. 145) — printed on invoices ──
    legalName:           { type: String, default: '', trim: true },
    legalForm:           { type: String, default: '', trim: true }, // SARL, SA, SARL AU, personne physique…
    shareCapital:        { type: String, default: '', trim: true },
    ice:                 { type: String, default: '', trim: true }, // Identifiant Commun de l'Entreprise (15 digits)
    identifiantFiscal:   { type: String, default: '', trim: true }, // IF
    taxeProfessionnelle: { type: String, default: '', trim: true }, // TP (ex-patente)
    rcNumber:            { type: String, default: '', trim: true }, // Registre de commerce
    rcCourt:             { type: String, default: '', trim: true }, // Tribunal / ville du RC
    cnss:                { type: String, default: '', trim: true },
    bankName:            { type: String, default: '', trim: true },
    rib:                 { type: String, default: '', trim: true },
    vatRegime:           { type: String, enum: ['standard', 'auto_entrepreneur'], default: 'standard' },
    autoEntrepreneurId:  { type: String, default: '', trim: true },
    defaultVatRate:      { type: Number, default: 0.2 },
    paymentTermsDays:    { type: Number, default: 60, min: 0, max: 120 },
    latePenaltyText:     { type: String, default: '' },
    applyCashStampDuty:  { type: Boolean, default: false },
    invoiceFooterText:   { type: String, default: '' },
    // Document numbering: free format (CGI art. 145 only requires unique, continuous numbers).
    invoicePrefix:       { type: String, default: 'FA', trim: true },
    creditNotePrefix:    { type: String, default: 'AV', trim: true },
    numberIncludesYear:  { type: Boolean, default: true },
  },
  { timestamps: true }
);
companySettingsSchema.plugin(tenantPlugin);
export const CompanySettings = models.CompanySettings || model('CompanySettings', companySettingsSchema);

// ── WHATSAPP SETTINGS ─────────────────────────────────────────────────────────
const whatsappSettingsSchema = new Schema(
  {
    enabled:             { type: Boolean, default: false },
    phoneNumberId:       { type: String, default: '', trim: true },
    accessToken:         { type: String, default: '', trim: true },
    businessAccountId:   { type: String, default: '', trim: true },
    defaultCountryCode:  { type: String, default: '', trim: true },
    quoteTemplateName:   { type: String, default: '', trim: true },
    quoteTemplateLang:   { type: String, default: 'fr', trim: true },
    receiptTemplateName: { type: String, default: '', trim: true },
    receiptTemplateLang: { type: String, default: 'fr', trim: true },
    invoiceTemplateName: { type: String, default: '', trim: true },
    invoiceTemplateLang: { type: String, default: 'fr', trim: true },
  },
  { timestamps: true }
);
whatsappSettingsSchema.plugin(tenantPlugin);
export const WhatsAppSettings = models.WhatsAppSettings || model('WhatsAppSettings', whatsappSettingsSchema);

// ── EMAIL SETTINGS ────────────────────────────────────────────────────────────
// mode 'platform' = the operator's shared SMTP service (PLATFORM_SMTP_* env vars);
// mode 'smtp' = the tenant's own SMTP account. smtpPassword is stored encrypted.
const emailTemplateSchema = new Schema(
  { subject: { type: String, default: '' }, body: { type: String, default: '' } },
  { _id: false }
);
const emailSettingsSchema = new Schema(
  {
    enabled:      { type: Boolean, default: false },
    mode:         { type: String, enum: ['platform', 'smtp'], default: 'platform' },
    language:     { type: String, enum: ['en', 'fr'], default: 'fr' }, // language of the default templates
    smtpHost:     { type: String, default: '', trim: true },
    smtpPort:     { type: Number, default: 587 },
    smtpSecure:   { type: Boolean, default: false },
    smtpUser:     { type: String, default: '', trim: true },
    smtpPassword: { type: String, default: '' },
    fromName:     { type: String, default: '', trim: true },
    fromEmail:    { type: String, default: '', trim: true, lowercase: true }, // smtp mode only
    replyTo:      { type: String, default: '', trim: true, lowercase: true },
    reminders: {
      deposit:    { enabled: { type: Boolean, default: false }, days: { type: Number, default: 14, min: 0 } },
      guestCount: { enabled: { type: Boolean, default: false }, days: { type: Number, default: 7,  min: 0 } },
      thankYou:   { enabled: { type: Boolean, default: false }, days: { type: Number, default: 1,  min: 0 } },
    },
    // Empty subject/body = use the built-in default for that type.
    templates: {
      quote:      { type: emailTemplateSchema, default: () => ({}) },
      receipt:    { type: emailTemplateSchema, default: () => ({}) },
      invoice:    { type: emailTemplateSchema, default: () => ({}) },
      deposit:    { type: emailTemplateSchema, default: () => ({}) },
      guestCount: { type: emailTemplateSchema, default: () => ({}) },
      thankYou:   { type: emailTemplateSchema, default: () => ({}) },
    },
  },
  { timestamps: true }
);
emailSettingsSchema.plugin(tenantPlugin);
export const EmailSettings = models.EmailSettings || model('EmailSettings', emailSettingsSchema);

// ── EMAIL LOG ─────────────────────────────────────────────────────────────────
const emailLogSchema = new Schema(
  {
    order:   { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    type:    { type: String, enum: ['quote', 'receipt', 'invoice', 'deposit', 'guestCount', 'thankYou', 'test'], required: true },
    to:      { type: String, required: true },
    subject: { type: String, default: '' },
    status:  { type: String, enum: ['sent', 'failed'], required: true },
    error:   { type: String, default: '' },
    trigger: { type: String, enum: ['manual', 'auto'], default: 'manual' },
    sentBy:  { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);
emailLogSchema.index({ order: 1, createdAt: -1 });
// An automatic reminder is sent at most once per order and type.
emailLogSchema.index(
  { tenantId: 1, order: 1, type: 1 },
  { unique: true, partialFilterExpression: { trigger: 'auto', status: 'sent' } }
);
emailLogSchema.plugin(tenantPlugin);
export const EmailLog = models.EmailLog || model('EmailLog', emailLogSchema);

// ── DOCUMENT LAYOUT SETTINGS ──────────────────────────────────────────────────
// Shared printable-layout config for quote (devis) and payment receipt PDFs.
const documentLayoutSettingsSchema = new Schema(
  {
    accentColor:       { type: String,  default: '#c9a96e', trim: true },
    fontStyle:         { type: String,  default: 'serif', enum: ['serif', 'sans'] },
    showLogo:          { type: Boolean, default: true },
    showAddress:       { type: Boolean, default: true },
    showPhone:         { type: Boolean, default: true },
    showEmail:         { type: Boolean, default: true },
    showVatNumber:     { type: Boolean, default: true },
    showStaffSection:  { type: Boolean, default: true },  // both docs
    showOrderItems:    { type: Boolean, default: true },  // receipt only
    showOptionPrices:  { type: Boolean, default: true },  // both docs
    showClientNotes:   { type: Boolean, default: true },  // quote only
    showInternalNotes: { type: Boolean, default: false }, // quote only
    showExternalNotes: { type: Boolean, default: true },  // both docs
    showFooter:        { type: Boolean, default: true },
  },
  { timestamps: true }
);
documentLayoutSettingsSchema.plugin(tenantPlugin);
export const DocumentLayoutSettings = models.DocumentLayoutSettings || model('DocumentLayoutSettings', documentLayoutSettingsSchema);

// ── TASK ──────────────────────────────────────────────────────────────────────
const taskSchema = new Schema(
  {
    type:          { type: String, enum: ['call', 'message', 'other'], required: true },
    scheduledDate: { type: Date, required: true },
    completed:     { type: Boolean, default: false },
    notes:         { type: String, default: '' },
    owner:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);
taskSchema.index({ owner: 1, scheduledDate: 1 });
taskSchema.plugin(tenantPlugin);
export const Task = models.Task || model('Task', taskSchema);

// ── ACTIVITY ──────────────────────────────────────────────────────────────────
const activitySchema = new Schema(
  {
    action:      { type: String, required: true, enum: [
      'order_created', 'customer_created', 'event_step_changed',
      'order_status_changed', 'payment_created', 'quote_generated',
      'inventory_adjusted', 'laundry_sent', 'laundry_received',
      'kitchen_stock_adjusted', 'kitchen_recipe_saved',
      'quote_sent', 'receipt_sent', 'email_sent', 'reminder_sent',
      'mfa_enabled', 'mfa_disabled', 'mfa_reset',
      'password_reset_sent', 'password_reset',
      'invoice_issued', 'credit_note_issued', 'invoice_sent',
      'case_created',
    ]},
    entityType:  { type: String, required: true },
    entityId:    { type: Schema.Types.ObjectId, required: true },
    entityLabel: { type: String, default: '' },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    metadata:    { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
activitySchema.index({ tenantId: 1, createdAt: -1 });
activitySchema.plugin(tenantPlugin);
export const Activity = models.Activity || model('Activity', activitySchema);

// ── NOTIFICATION ──────────────────────────────────────────────────────────────
// Per-user in-app notifications (lib/notifications.ts). Text is rendered from
// type + params (lib/notificationText.ts) so it follows the reader's language.
export const NOTIFICATION_GROUPS = ['event', 'task', 'sales', 'stock', 'system'];
const notificationSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    group:     { type: String, enum: NOTIFICATION_GROUPS, required: true },
    type:      { type: String, required: true },
    params:    { type: Schema.Types.Mixed, default: {} },
    link:      { type: String, default: '' },
    actor:     { type: Schema.Types.ObjectId, ref: 'User', default: null },
    readAt:    { type: Date, default: null },
    // Set by scheduled jobs so a daily run never sends the same notice twice.
    dedupeKey: { type: String },
  },
  { timestamps: true }
);
notificationSchema.index({ tenantId: 1, recipient: 1, readAt: 1, createdAt: -1 });
notificationSchema.index(
  { tenantId: 1, recipient: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } },
);
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
notificationSchema.plugin(tenantPlugin);
export const Notification = models.Notification || model('Notification', notificationSchema);

// ── PASSWORD RESET TOKEN ──────────────────────────────────────────────────────
// One-time links emailed by a tenant admin or the platform operator. No
// tenantPlugin: the public reset page looks tokens up across all tenants.
// Only the sha256 hash of the token is stored.
const passwordResetTokenSchema = new Schema(
  {
    user:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tenantId:  { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt:    { type: Date, default: null },
    requestedBy: {
      kind: { type: String, enum: ['tenant_admin', 'platform'], required: true },
      id:   { type: Schema.Types.ObjectId, default: null },
      name: { type: String, default: '' },
    },
  },
  { timestamps: true }
);
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const PasswordResetToken = models.PasswordResetToken || model('PasswordResetToken', passwordResetTokenSchema);

// ── CALENDAR FEED ─────────────────────────────────────────────────────────────
// Private iCal subscription links (Google / Apple / Outlook "subscribe from URL").
// No tenantPlugin: the public feed endpoint looks tokens up across tenants, so
// tenant-side code must always filter by tenantId itself. Only the sha256 hash
// of the token is stored; the raw URL is shown to the user once.
const calendarFeedSchema = new Schema(
  {
    user:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId:       { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    scope:          { type: String, enum: ['all', 'mine'], required: true },
    tokenHash:      { type: String, required: true, unique: true },
    lastAccessedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
calendarFeedSchema.index({ tenantId: 1, user: 1, scope: 1 }, { unique: true });
export const CalendarFeed = models.CalendarFeed || model('CalendarFeed', calendarFeedSchema);

// Attempt counters for login / code / password checks, shared by all server
// instances (see lib/rateLimit.ts). No tenantPlugin: used before login. The key
// is a hash, so no email or IP address is stored. Rows delete themselves.
const rateLimitHitSchema = new Schema({
  key:       { type: String, required: true, unique: true },
  count:     { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
rateLimitHitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const RateLimitHit = models.RateLimitHit || model('RateLimitHit', rateLimitHitSchema);

// ── KITCHEN STOCK ─────────────────────────────────────────────────────────────
const kitchenStockItemSchema = new Schema(
  {
    name:         { type: String, required: true, trim: true },
    nameAr:       { type: String, default: '', trim: true },
    category:     { type: String, default: 'other', trim: true, enum: ['vegetables', 'dairy', 'meat', 'dry', 'spices', 'beverages', 'other'] },
    unit:         { type: String, default: 'kg', trim: true },
    currentStock: { type: Number, default: 0, min: 0 },
    minStock:     { type: Number, default: 0, min: 0 },
    unitCost:     { type: Number, default: 0, min: 0 },
    notes:        { type: String, default: '' },
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
);
kitchenStockItemSchema.plugin(tenantPlugin);
export const KitchenStockItem = models.KitchenStockItem || model('KitchenStockItem', kitchenStockItemSchema);

const kitchenStockAdjustmentSchema = new Schema(
  {
    item:           { type: Schema.Types.ObjectId, ref: 'KitchenStockItem', required: true },
    adjustmentType: { type: String, enum: ['purchase', 'usage', 'write-off', 'return'], required: true },
    quantity:       { type: Number, required: true },
    date:           { type: Date, default: Date.now },
    notes:          { type: String, default: '' },
    performedBy:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);
kitchenStockAdjustmentSchema.index({ item: 1, createdAt: -1 });
kitchenStockAdjustmentSchema.plugin(tenantPlugin);
export const KitchenStockAdjustment = models.KitchenStockAdjustment || model('KitchenStockAdjustment', kitchenStockAdjustmentSchema);

// ── KITCHEN RECIPES ───────────────────────────────────────────────────────────
const recipeIngredientSchema = new Schema(
  {
    stockItem: { type: Schema.Types.ObjectId, ref: 'KitchenStockItem', required: true },
    quantity:  { type: Number, required: true, min: 0 },
    unit:      { type: String, default: '', trim: true },
  },
  { _id: false }
);

const kitchenRecipeSchema = new Schema(
  {
    name:         { type: String, required: true, trim: true },
    nameFr:       { type: String, default: '', trim: true },
    category:     { type: String, enum: ['starter', 'main', 'dessert', 'side', 'other'], default: 'other' },
    servings:     { type: Number, default: 1, min: 1 },
    description:  { type: String, default: '' },
    instructions: { type: String, default: '' },
    prepTime:     { type: Number, default: 0, min: 0 },
    cookTime:     { type: Number, default: 0, min: 0 },
    ingredients:  [recipeIngredientSchema],
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
);
kitchenRecipeSchema.plugin(tenantPlugin);
export const KitchenRecipe = models.KitchenRecipe || model('KitchenRecipe', kitchenRecipeSchema);

// ══ PLATFORM (cross-tenant) ═══════════════════════════════════════════════════
// These models belong to the SaaS operator, not to a tenant, so they do NOT use
// tenantPlugin. Only /api/platform/** and the auth/license layer touch them.

// ── PLAN ──────────────────────────────────────────────────────────────────────
const planSchema = new Schema(
  {
    name:     { type: String, required: true, unique: true, trim: true },
    maxUsers: { type: Number, default: 0, min: 0 }, // 0 = unlimited
    modules:  [{ type: String, trim: true }],       // optional module ids allowed (see MODULE_REGISTRY)
    isActive: { type: Boolean, default: true },
    price:         { type: Number, default: 0, min: 0 },
    currency:      { type: String, default: 'MAD', trim: true, uppercase: true },
    billingPeriod: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  },
  { timestamps: true }
);
export const Plan = models.Plan || model('Plan', planSchema);

// ── TENANT (a customer company) ───────────────────────────────────────────────
const tenantSchema = new Schema(
  {
    name:         { type: String, required: true, trim: true },
    slug:         { type: String, required: true, unique: true, trim: true, lowercase: true },
    contactName:  { type: String, default: '', trim: true },
    contactEmail: { type: String, default: '', trim: true, lowercase: true },
    contactPhone: { type: String, default: '', trim: true },
    // 'pending_contract': newly created, blocked until its contract is confirmed.
    status:       { type: String, enum: ['active', 'suspended', 'pending_contract'], default: 'active' },
    plan:         { type: Schema.Types.ObjectId, ref: 'Plan', default: null },
    // The customer's legal identity, printed on its contract.
    legal: {
      legalName:           { type: String, default: '', trim: true },
      legalForm:           { type: String, default: '', trim: true },
      ice:                 { type: String, default: '', trim: true },
      identifiantFiscal:   { type: String, default: '', trim: true },
      rcNumber:            { type: String, default: '', trim: true },
      rcCourt:             { type: String, default: '', trim: true },
      address:             { type: String, default: '', trim: true },
      city:                { type: String, default: '', trim: true },
      representativeName:  { type: String, default: '', trim: true },
      representativeTitle: { type: String, default: '', trim: true },
    },
    // Per-tenant overrides of the plan; null = inherit from plan.
    overrides: {
      maxUsers: { type: Number, default: null },
      modules:  { type: [String], default: null },
    },
    license: {
      startsAt:  { type: Date, default: Date.now },
      expiresAt: { type: Date, required: true },
    },
    notes:          { type: String, default: '' },
    lastActivityAt: { type: Date, default: null },
  },
  { timestamps: true }
);
export const Tenant = models.Tenant || model('Tenant', tenantSchema);

// ── PLATFORM ADMIN (SaaS operator account, separate from tenant users) ─────────
const platformAdminSchema = new Schema(
  {
    name:         { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    isActive:     { type: Boolean, default: true },
    sessionVersion: { type: Number, default: 0 },
    mfaEnabled:       { type: Boolean, default: false },
    mfaSecret:        { type: String, select: false },
    mfaPendingSecret: { type: String, select: false },
    mfaRecoveryCodes: { type: [String], select: false },
    mfaLastStep:      { type: Number, select: false },
  },
  { timestamps: true }
);
export const PlatformAdmin = models.PlatformAdmin || model('PlatformAdmin', platformAdminSchema);

// ── TENANT PAYMENT (subscription payment received from a tenant) ──────────────
// Kept when the tenant is deleted (accounting history), hence the name snapshot.
const tenantPaymentSchema = new Schema(
  {
    tenant:        { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    tenantName:    { type: String, default: '', trim: true },
    invoiceNumber: { type: String, required: true, unique: true },
    amount:        { type: Number, required: true, min: 0 },
    currency:      { type: String, default: 'MAD', trim: true, uppercase: true },
    paidAt:        { type: Date, required: true, index: true },
    periodFrom:    { type: Date, required: true },
    periodTo:      { type: Date, required: true },
    method:        { type: String, enum: ['cash', 'transfer', 'cheque', 'card', 'other'], default: 'transfer' },
    reference:     { type: String, default: '', trim: true },
    note:          { type: String, default: '', trim: true },
    createdBy:     { type: Schema.Types.ObjectId, ref: 'PlatformAdmin', default: null },
  },
  { timestamps: true }
);
export const TenantPayment = models.TenantPayment || model('TenantPayment', tenantPaymentSchema);

// ── PLATFORM SETTINGS (singleton, _id 'default') ──────────────────────────────
// The operator's own legal identity (contracts + platform invoices) and the
// contract templates per language. Empty fields fall back to env / built-ins.
const pStr = () => ({ type: String, default: '', trim: true });
const platformSettingsSchema = new Schema(
  {
    _id: { type: String, default: 'default' },
    issuer: {
      name: pStr(), legalName: pStr(), legalForm: pStr(), shareCapital: pStr(), ice: pStr(),
      identifiantFiscal: pStr(), rcNumber: pStr(), rcCourt: pStr(), taxeProfessionnelle: pStr(),
      address: pStr(), city: pStr(), email: pStr(), phone: pStr(),
      representativeName: pStr(), representativeTitle: pStr(),
    },
    contractTemplates: {
      fr: { type: String, default: '' },
      en: { type: String, default: '' },
      ar: { type: String, default: '' },
    },
    defaultContractLanguage: { type: String, enum: ['fr', 'en', 'ar'], default: 'fr' },
  },
  { timestamps: true }
);
export const PlatformSettings = models.PlatformSettings || model('PlatformSettings', platformSettingsSchema);

// ── TENANT CONTRACT (legal agreement: draft → issued → signed → confirmed) ─────
const tenantContractSchema = new Schema(
  {
    tenant:     { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    tenantName: { type: String, default: '', trim: true },
    // Assigned when issued (CTR-YYYY-0001), so drafts don't consume numbers.
    number:   { type: String, default: null },
    language: { type: String, enum: ['fr', 'en', 'ar'], default: 'fr' },
    status:   { type: String, enum: ['draft', 'issued', 'signed', 'confirmed', 'cancelled'], default: 'draft' },
    body:         { type: String, default: '' }, // template text with {{placeholders}}, editable in draft
    renderedBody: { type: String, default: '' }, // placeholders resolved, frozen at issue
    snapshot:     { type: Schema.Types.Mixed, default: null },
    signedFile: {
      objectPath:   { type: String, default: null },
      originalName: { type: String, default: '' },
      size:         { type: Number, default: 0 },
      uploadedAt:   { type: Date, default: null },
      uploadedBy:   { type: String, default: '' },
    },
    issuedAt:     { type: Date, default: null },
    confirmedAt:  { type: Date, default: null },
    confirmedBy:  { type: Schema.Types.ObjectId, ref: 'PlatformAdmin', default: null },
    cancelledAt:  { type: Date, default: null },
    cancelReason: { type: String, default: '' },
    events: [{
      _id: false,
      at:     { type: Date, default: Date.now },
      action: { type: String, required: true },
      by:     { type: String, default: '' },
      note:   { type: String, default: '' },
    }],
  },
  { timestamps: true }
);
tenantContractSchema.index({ number: 1 }, { unique: true, partialFilterExpression: { number: { $type: 'string' } } });
export const TenantContract = models.TenantContract || model('TenantContract', tenantContractSchema);

// ── PLATFORM COUNTER (monotonic sequences, e.g. invoice numbers per year) ──────
const platformCounterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });
export const PlatformCounter = models.PlatformCounter || model('PlatformCounter', platformCounterSchema);

// ── SYSTEM LOG (errors / warnings, read in the platform console) ──────────────
// Platform model (no tenantPlugin). Content is sanitized by lib/logSanitizer.ts
// before it gets here: no request bodies, user identity, IPs or personal data.
// Repeats of the same open error are grouped (count + lastSeen).
const LOG_RETENTION_DAYS = Math.max(1, Number(process.env.LOG_RETENTION_DAYS) || 30);
const systemLogSchema = new Schema(
  {
    level:       { type: String, enum: ['error', 'warn'], required: true },
    source:      { type: String, enum: ['server', 'client'], default: 'server' },
    fingerprint: { type: String, required: true },
    tenant:      { type: Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },
    tenantName:  { type: String, default: '' },
    role:        { type: String, default: '' },
    method:      { type: String, default: '' },
    route:       { type: String, default: '' },
    status:      { type: Number, default: null },
    name:        { type: String, default: '' },
    code:        { type: String, default: '' },
    message:     { type: String, default: '' },
    stack:       { type: String, default: '' },
    browser:     { type: String, default: '' },
    count:       { type: Number, default: 1 },
    firstSeen:   { type: Date, default: Date.now },
    lastSeen:    { type: Date, default: Date.now },
    resolved:    { type: Boolean, default: false },
    resolvedAt:  { type: Date, default: null },
  },
  { timestamps: false }
);
systemLogSchema.index({ fingerprint: 1, tenant: 1, resolved: 1 });
systemLogSchema.index({ level: 1, lastSeen: -1 });
systemLogSchema.index({ lastSeen: 1 }, { expireAfterSeconds: LOG_RETENTION_DAYS * 24 * 3600 });
export const SystemLog = models.SystemLog || model('SystemLog', systemLogSchema);

// ── SUPPORT CASE (tenant → platform operator support ticket) ──────────────────
// Tenant-owned (tenantPlugin) so tenant routes are isolated automatically; the
// platform console reads across tenants via runAsSystem. `internalNotes` is
// select:false — operator-only, never returned unless asked for explicitly.
const caseMessageSchema = new Schema({
  authorType: { type: String, enum: ['tenant', 'platform'], required: true },
  authorId:   { type: Schema.Types.ObjectId, default: null },
  authorName: { type: String, default: '', trim: true },
  body:       { type: String, required: true, trim: true, maxlength: CASE_BODY_MAX },
  createdAt:  { type: Date, default: Date.now },
});
const caseNoteSchema = new Schema({
  authorId:   { type: Schema.Types.ObjectId, ref: 'PlatformAdmin', default: null },
  authorName: { type: String, default: '', trim: true },
  body:       { type: String, required: true, trim: true, maxlength: CASE_BODY_MAX },
  createdAt:  { type: Date, default: Date.now },
});
const supportCaseSchema = new Schema(
  {
    caseNumber:    { type: String, required: true, unique: true },
    tenantName:    { type: String, default: '', trim: true },
    subject:       { type: String, required: true, trim: true, maxlength: CASE_SUBJECT_MAX },
    category:      { type: String, enum: CASE_CATEGORIES, default: 'other' },
    priority:      { type: String, enum: CASE_PRIORITIES, default: 'normal' },
    status:        { type: String, enum: CASE_STATUSES, default: 'open' },
    createdBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, default: '', trim: true },
    assignedTo:    { type: Schema.Types.ObjectId, ref: 'PlatformAdmin', default: null },
    messages:      { type: [caseMessageSchema], default: [] },
    internalNotes: { type: [caseNoteSchema], default: [], select: false },
    lastMessageAt: { type: Date, default: Date.now },
    lastMessageBy: { type: String, enum: ['tenant', 'platform'], default: 'tenant' },
    resolvedAt:    { type: Date, default: null },
    closedAt:      { type: Date, default: null },
  },
  { timestamps: true }
);
supportCaseSchema.index({ tenantId: 1, status: 1, lastMessageAt: -1 });
supportCaseSchema.index({ tenantId: 1, createdBy: 1, lastMessageAt: -1 });
supportCaseSchema.index({ status: 1, lastMessageAt: -1 });
supportCaseSchema.plugin(tenantPlugin);
export const SupportCase = models.SupportCase || model('SupportCase', supportCaseSchema);
