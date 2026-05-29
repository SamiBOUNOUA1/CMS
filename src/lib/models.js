import mongoose, { Schema, models, model } from 'mongoose';

// ── ORDER STATUS CONFIG ───────────────────────────────────────────────────────
const orderStatusConfigSchema = new Schema(
  {
    name:         { type: String, required: true, unique: true, trim: true, lowercase: true },
    label:        { type: String, required: true, trim: true },
    color:        { type: String, default: '#5f6368', trim: true },
    triggerEvent: { type: Boolean, default: false },
    isSystem:     { type: Boolean, default: false },
    sortOrder:    { type: Number, default: 0 },
  },
  { timestamps: true }
);
export const OrderStatusConfig = models.OrderStatusConfig || model('OrderStatusConfig', orderStatusConfigSchema);

// ── EVENT TYPE CONFIG ─────────────────────────────────────────────────────────
const eventTypeConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    countMode: { type: String, enum: ['persons', 'tables'], default: 'persons' },
    tableCapacity: { type: Number, default: 10, min: 1 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);
export const EventTypeConfig = models.EventTypeConfig || model('EventTypeConfig', eventTypeConfigSchema);

// ── ROLE ──────────────────────────────────────────────────────────────────────
const roleSchema = new Schema(
  {
    name:      { type: String, required: true, unique: true, trim: true, lowercase: true },
    label:     { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
    isSystem:  { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);
export const Role = models.Role || model('Role', roleSchema);

// ── ROLE PERMISSIONS ──────────────────────────────────────────────────────────
const rolePermissionsSchema = new Schema(
  {
    role: { type: String, required: true, unique: true },
    permissions: { type: Map, of: Boolean, default: {} },
  },
  { timestamps: true }
);
export const RolePermissions = models.RolePermissions || model('RolePermissions', rolePermissionsSchema);

// ── USER ──────────────────────────────────────────────────────────────────────
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, default: 'viewer' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
export const User = models.User || model('User', userSchema);

// ── CATEGORY ──────────────────────────────────────────────────────────────────
const categorySchema = new Schema(
  { name: { type: String, required: true, trim: true, unique: true } },
  { timestamps: true }
);
export const Category = models.Category || model('Category', categorySchema);

// ── PRODUCT ───────────────────────────────────────────────────────────────────
const subItemSchema = new Schema({
  name: { type: String, required: true, trim: true },
});

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    shortDescription: { type: String, trim: true, default: '' },
    productType: { type: String, enum: ['simple', 'bundle'], default: 'simple' },
    defaultPrice: { type: Number, default: 0, min: 0 },
    unit: { type: String, default: 'item', trim: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    subItems: [subItemSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
export const Product = models.Product || model('Product', productSchema);

// ── CLIENT ────────────────────────────────────────────────────────────────────
const clientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    billingAddress: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: 'FR' },
    },
    notes: String,
  },
  { timestamps: true }
);
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
export const MenuPackage = models.MenuPackage || model('MenuPackage', menuPackageSchema);

// ── EVENT ─────────────────────────────────────────────────────────────────────
const eventSchema = new Schema(
  {
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    venue: { type: Schema.Types.ObjectId, ref: 'Venue' },
    eventDate: { type: Date, required: true },
    eventType: {
      type: String,
      enum: ['wedding', 'corporate', 'birthday', 'gala', 'conference', 'buffet', 'other'],
      required: true,
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
  },
  { timestamps: true }
);
export const Event = models.Event || model('Event', eventSchema);

// ── ORDER ─────────────────────────────────────────────────────────────────────
const orderSchema = new Schema(
  {
    clientName:  { type: String, required: true, trim: true },
    clientEmail: { type: String, required: true, lowercase: true, trim: true },
    clientPhone: { type: String, trim: true },
    eventDate:   { type: Date, required: true },
    eventType: {
      type: String,
      enum: ['wedding', 'corporate', 'birthday', 'gala', 'conference', 'buffet', 'other'],
      required: true,
    },
    guestCount:  { type: Number, required: true, min: 1 },
    tableCount:  { type: Number, min: 1 },
    startTime:   String,
    notes:       String,
    status:      { type: String, required: true, default: 'new' },
    event:       { type: Schema.Types.ObjectId, ref: 'Event' },
    createdBy:   { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
export const Order = models.Order || model('Order', orderSchema);

// ── QUOTE ─────────────────────────────────────────────────────────────────────
const lineItemSchema = new Schema({
  catalogItem: { type: Schema.Types.ObjectId, ref: 'CatalogItem' },
  name: { type: String, required: true },
  groupLabel: { type: String, default: '' },
  category: String,
  quantity: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 },
  notes: String,
  subItems: [{ name: { type: String, required: true } }],
});

const staffAssignmentSchema = new Schema({
  role: {
    type: String,
    enum: ['head-chef', 'sous-chef', 'server', 'bartender', 'coordinator', 'other'],
    required: true,
  },
  count: { type: Number, default: 1, min: 1 },
  hours: { type: Number, required: true, min: 0 },
  ratePerHour: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 },
  notes: String,
});

const quoteSchema = new Schema(
  {
    order:         { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    versionNumber: { type: Number, default: 1 },
    isActive:      { type: Boolean, default: true },
    validUntil:    Date,
    lineItems:     [lineItemSchema],
    staffAssignments: [staffAssignmentSchema],
    subtotal:      { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxRate:       { type: Number, default: 0.2 },
    taxAmount:     { type: Number, default: 0 },
    total:         { type: Number, default: 0 },
    internalNotes: String,
    clientNotes:   String,
  },
  { timestamps: true }
);

quoteSchema.pre('save', function (next) {
  const itemsTotal = this.lineItems.reduce((s, li) => s + li.lineTotal, 0);
  const staffTotal = this.staffAssignments.reduce((s, sa) => s + sa.lineTotal, 0);
  this.subtotal = +(itemsTotal + staffTotal - this.discountAmount).toFixed(2);
  this.taxAmount = +(this.subtotal * this.taxRate).toFixed(2);
  this.total = +(this.subtotal + this.taxAmount).toFixed(2);
  next();
});

export const Quote = models.Quote || model('Quote', quoteSchema);

// ── INVOICE ───────────────────────────────────────────────────────────────────
const invoiceSchema = new Schema(
  {
    quote: { type: Schema.Types.ObjectId, ref: 'Quote', required: true },
    invoiceNumber: { type: String, required: true, unique: true },
    issuedDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'partially-paid', 'paid', 'overdue', 'cancelled'],
      default: 'pending',
    },
    subtotal: Number,
    taxAmount: Number,
    total: Number,
    amountPaid: { type: Number, default: 0 },
    amountDue: Number,
    notes: String,
  },
  { timestamps: true }
);
export const Invoice = models.Invoice || model('Invoice', invoiceSchema);

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
  },
  { timestamps: true }
);
export const CompanySettings = models.CompanySettings || model('CompanySettings', companySettingsSchema);

