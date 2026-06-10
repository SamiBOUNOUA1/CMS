// @ts-nocheck
import mongoose, { Schema, models, model } from 'mongoose';

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
export const TravelRegionConfig = models.TravelRegionConfig || model('TravelRegionConfig', travelRegionConfigSchema);

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

// ── CUSTOMER TYPE CONFIG ──────────────────────────────────────────────────────
const customerTypeConfigSchema = new Schema(
  {
    key:       { type: String, required: true, unique: true, trim: true, lowercase: true },
    label:     { type: String, required: true, trim: true },
    isActive:  { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);
export const CustomerTypeConfig = models.CustomerTypeConfig || model('CustomerTypeConfig', customerTypeConfigSchema);

// ── STAFF ROLE CONFIG ─────────────────────────────────────────────────────────
const staffRoleConfigSchema = new Schema(
  {
    key:       { type: String, required: true, unique: true, trim: true },
    label:     { type: String, required: true, trim: true },
    isActive:  { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);
export const StaffRoleConfig = models.StaffRoleConfig || model('StaffRoleConfig', staffRoleConfigSchema);

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
    linkedRecipe: { type: Schema.Types.ObjectId, ref: 'KitchenRecipe', default: null },
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
    customerType: { type: String, trim: true, default: '' },
    leadSource: { type: String, trim: true, default: '' },
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
export const Event = models.Event || model('Event', eventSchema);

// ── STAFF ASSIGNMENT (shared by Order and Quote) ──────────────────────────────
const staffAssignmentSchema = new Schema({
  role: { type: String, required: true },
  count: { type: Number, default: 1, min: 1 },
  hours: { type: Number, required: true, min: 0 },
  ratePerHour: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 },
  notes: String,
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

export const FlowTemplate = models.FlowTemplate || model('FlowTemplate', flowTemplateSchema);

// ── ORDER LINE GROUPS (editable working state stored on Order) ─────────────────
const orderLineGroupItemSchema = new Schema({
  catalogItem: { type: Schema.Types.ObjectId, ref: 'CatalogItem' },
  _productId: { type: String, default: '' },
  name: String,
  unitPrice: { type: Number, default: 0 },
  category: String,
  notes: String,
  subItems: [{ name: String }],
}, { _id: false });

const orderLineGroupSchema = new Schema({
  label: { type: String, default: '' },
  count: { type: Number, default: 1 },
  items: [orderLineGroupItemSchema],
});

// ── ORDER ─────────────────────────────────────────────────────────────────────
const orderSchema = new Schema(
  {
    clientName:  { type: String, required: true, trim: true },
    clientEmail: { type: String, required: true, lowercase: true, trim: true },
    clientPhone: { type: String, trim: true },
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
    notes:       String,
    status:        { type: String, required: true, default: 'new' },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partially-paid', 'fully-paid'],
      default: 'unpaid',
    },
    event:           { type: Schema.Types.ObjectId, ref: 'Event' },
    createdBy:       { type: Schema.Types.ObjectId, ref: 'User' },
    assignedManager: { type: Schema.Types.ObjectId, ref: 'User' },
    travelRegion:     { type: String, default: '' },
    travelPrice:      { type: Number, default: 0 },
    discountAmount:   { type: Number, default: 0 },
    lineGroups:       [orderLineGroupSchema],
    staffAssignments: [staffAssignmentSchema],
    totalAmount:      { type: Number, default: 0 },
    flowInstance: {
      templateId:   { type: Schema.Types.ObjectId, ref: 'FlowTemplate' },
      templateName: { type: String, default: '' },
      steps:        [flowInstanceStepSchema],
    },
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
  const travelTotal = this.travelFee || 0;
  this.subtotal = +(itemsTotal + staffTotal + travelTotal - this.discountAmount).toFixed(2);
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
export const Payment = models.Payment || model('Payment', paymentSchema);

// ── MODULE CONFIG ─────────────────────────────────────────────────────────────
const moduleConfigSchema = new Schema(
  {
    moduleId:  { type: String, required: true, unique: true, trim: true },
    isEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);
export const ModuleConfig = models.ModuleConfig || model('ModuleConfig', moduleConfigSchema);

// ── INVENTORY CATEGORY ────────────────────────────────────────────────────────
const inventoryCategorySchema = new Schema(
  {
    name:  { type: String, required: true, unique: true, trim: true },
    color: { type: String, default: '#5f6368', trim: true },
  },
  { timestamps: true }
);
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
export const InventoryItem = models.InventoryItem || model('InventoryItem', inventoryItemSchema);

// ── INVENTORY ADJUSTMENT ──────────────────────────────────────────────────────
const inventoryAdjustmentSchema = new Schema(
  {
    item:           { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    adjustmentType: { type: String, enum: ['purchase', 'usage', 'return', 'write-off'], required: true },
    quantity:       { type: Number, required: true },
    date:           { type: Date, default: Date.now },
    notes:          { type: String, default: '' },
    performedBy:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);
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
    batchNumber:        { type: String, required: true, unique: true, trim: true },
    date:               { type: Date, required: true, default: Date.now },
    order:              { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    status:             { type: String, enum: ['draft', 'sent', 'returned', 'completed'], default: 'draft' },
    notes:              { type: String, default: '' },
    items:              [laundryBatchItemSchema],
    createdBy:          { type: Schema.Types.ObjectId, ref: 'User', default: null },
    inventoryProcessed: { type: Boolean, default: false },
  },
  { timestamps: true }
);
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
  },
  { timestamps: true }
);
export const CompanySettings = models.CompanySettings || model('CompanySettings', companySettingsSchema);

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
export const Task = models.Task || model('Task', taskSchema);

// ── ACTIVITY ──────────────────────────────────────────────────────────────────
const activitySchema = new Schema(
  {
    action:      { type: String, required: true, enum: [
      'order_created', 'customer_created', 'event_step_changed',
      'order_status_changed', 'payment_created', 'quote_generated',
      'inventory_adjusted', 'laundry_sent', 'laundry_received',
      'kitchen_stock_adjusted', 'kitchen_recipe_saved',
    ]},
    entityType:  { type: String, required: true },
    entityId:    { type: Schema.Types.ObjectId, required: true },
    entityLabel: { type: String, default: '' },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    metadata:    { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
activitySchema.index({ createdAt: -1 });
export const Activity = models.Activity || model('Activity', activitySchema);

// ── KITCHEN STOCK ─────────────────────────────────────────────────────────────
const kitchenStockItemSchema = new Schema(
  {
    name:         { type: String, required: true, trim: true },
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
export const KitchenRecipe = models.KitchenRecipe || model('KitchenRecipe', kitchenRecipeSchema);
