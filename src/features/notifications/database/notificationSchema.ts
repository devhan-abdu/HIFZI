import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';


export const habitEvents = sqliteTable('habit_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  habitType: text('habit_type', { enum: ['hifz', 'muraja'] }).notNull(),
  status: text('status', { enum: ['completed', 'partial', 'missed'] }).notNull(),
  date: text('date').notNull(),
  xpGained: integer('xp_gained').notNull().default(0),
  remoteId: text('remote_id'),
  syncStatus: integer('sync_status').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  unqUserHabitDate: uniqueIndex('unq_user_habit_date').on(table.userId, table.habitType, table.date),
  idxUserDate: index('idx_habit_events_user_date').on(table.userId, table.date),
}));


export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  type: text('type', { enum: ['xp', 'warning', 'milestone'] }).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: integer('is_read').notNull().default(0),
  eventKey: text('event_key').notNull(), 
  lastNotifiedAt: text('last_notified_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  syncStatus: integer('sync_status').notNull().default(0),
  remoteId: text('remote_id'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  unqUserEvent: uniqueIndex('unq_user_notification_event').on(table.userId, table.eventKey),
  idxUserCreated: index('idx_notifications_user_created').on(table.userId, table.createdAt),
}));


export const notificationQueue = sqliteTable('notification_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  notificationId: integer('notification_id').notNull(),
  syncStatus: integer('sync_status').notNull().default(0),
  remoteId: text('remote_id'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  unqUserNotification: uniqueIndex('unq_notif_queue_user_notif').on(table.userId, table.notificationId),
}));


export const scheduledNotifications = sqliteTable('scheduled_notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  kind: text('kind').notNull(),
  habitType: text('habit_type'),
  eventKey: text('event_key').notNull(),
  scheduledFor: text('scheduled_for').notNull(),
  notificationIdentifier: text('notification_identifier'),
  status: text('status').notNull().default('scheduled'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  unqUserEvent: uniqueIndex('unq_scheduled_user_event').on(table.userId, table.eventKey),
  idxUserKind: index('idx_scheduled_user_kind').on(table.userId, table.kind, table.scheduledFor),
}));
