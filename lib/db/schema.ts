import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  password: text('password').notNull(),
  role: text('role').default('ADMIN').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export const usersRelations = relations(users, ({ many }) => ({
  serviceOrdersCreated: many(serviceOrders, { relationName: 'creator' }),
  notifications: many(notifications),
}));

export const clients = sqliteTable('clients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  phone: text('phone').notNull(),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  complement: text('complement'),
  country: text('country').default('Brasil'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  document: text('document'),
  documentType: text('document_type'),
  clientType: text('client_type'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export const clientsRelations = relations(clients, ({ many }) => ({
  serviceOrders: many(serviceOrders),
  notifications: many(notifications),
  openingQueueItems: many(openingQueueItems),
}));

export const technicians = sqliteTable('technicians', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  phone: text('phone').notNull(),
  specializations: text('specializations'),
  isAvailable: integer('is_available', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export const techniciansRelations = relations(technicians, ({ many }) => ({
  serviceOrders: many(serviceOrders),
}));

export const serviceOrders = sqliteTable('service_orders', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').unique().notNull(),
  clientId: text('client_id').notNull().references(() => clients.id),
  technicianId: text('technician_id').references(() => technicians.id),
  equipmentType: text('equipment_type').notNull(),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  serialNumber: text('serial_number'),
  status: text('status').default('SEM_VER').notNull(),
  reportedDefect: text('reported_defect').notNull(),
  receivedAccessories: text('received_accessories'),
  budgetNote: text('budget_note'),
  technicalExplanation: text('technical_explanation'),
  price: real('price'),
  cost: real('cost'),
  budgetItems: text('budget_items', { mode: 'json' }),
  
  arrivalDate: integer('arrival_date', { mode: 'timestamp' }),
  openingDate: integer('opening_date', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  completionDate: integer('completion_date', { mode: 'timestamp' }),
  deliveryDate: integer('delivery_date', { mode: 'timestamp' }),
  paymentDate: integer('payment_date', { mode: 'timestamp' }),
  
  receiptGenerated: integer('receipt_generated', { mode: 'boolean' }).default(false).notNull(),
  receiptGeneratedAt: integer('receipt_generated_at', { mode: 'timestamp' }),
  receiptPath: text('receipt_path'),
  
  createdById: text('created_by_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export const serviceOrdersRelations = relations(serviceOrders, ({ one, many }) => ({
  client: one(clients, {
    fields: [serviceOrders.clientId],
    references: [clients.id],
  }),
  technician: one(technicians, {
    fields: [serviceOrders.technicianId],
    references: [technicians.id],
  }),
  createdBy: one(users, {
    fields: [serviceOrders.createdById],
    references: [users.id],
    relationName: 'creator',
  }),
  notifications: many(notifications),
  receiptDeliveries: many(receiptDeliveries),
}));

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').default('INFO').notNull(),
  isRead: integer('is_read', { mode: 'boolean' }).default(false).notNull(),
  
  userId: text('user_id').references(() => users.id),
  clientId: text('client_id').references(() => clients.id),
  serviceOrderId: text('service_order_id').references(() => serviceOrders.id),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [notifications.clientId],
    references: [clients.id],
  }),
  serviceOrder: one(serviceOrders, {
    fields: [notifications.serviceOrderId],
    references: [serviceOrders.id],
  }),
}));

export const receiptDeliveries = sqliteTable('receipt_deliveries', {
  id: text('id').primaryKey(),
  serviceOrderId: text('service_order_id').notNull().references(() => serviceOrders.id),
  deliveryMethod: text('delivery_method').notNull(),
  status: text('status').default('PENDING').notNull(),
  recipientEmail: text('recipient_email'),
  recipientPhone: text('recipient_phone'),
  errorMessage: text('error_message'),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export const receiptDeliveriesRelations = relations(receiptDeliveries, ({ one }) => ({
  serviceOrder: one(serviceOrders, {
    fields: [receiptDeliveries.serviceOrderId],
    references: [serviceOrders.id],
  }),
}));

export const openingQueueItems = sqliteTable('opening_queue_items', {
  id: text('id').primaryKey(),
  clientId: text('client_id').references(() => clients.id),
  clientName: text('client_name').notNull(),
  contactPhone: text('contact_phone').notNull(),
  equipmentType: text('equipment_type').notNull(),
  equipmentDesc: text('equipment_desc'),
  arrivalDate: integer('arrival_date', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
  positionIndex: integer('position_index').default(0).notNull(),
  status: text('status').default('PENDING').notNull(),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export const openingQueueItemsRelations = relations(openingQueueItems, ({ one }) => ({
  client: one(clients, {
    fields: [openingQueueItems.clientId],
    references: [clients.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

export type Technician = typeof technicians.$inferSelect;
export type NewTechnician = typeof technicians.$inferInsert;

export type ServiceOrder = typeof serviceOrders.$inferSelect;
export type NewServiceOrder = typeof serviceOrders.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type ReceiptDelivery = typeof receiptDeliveries.$inferSelect;
export type NewReceiptDelivery = typeof receiptDeliveries.$inferInsert;

export type OpeningQueueItem = typeof openingQueueItems.$inferSelect;
export type NewOpeningQueueItem = typeof openingQueueItems.$inferInsert;
