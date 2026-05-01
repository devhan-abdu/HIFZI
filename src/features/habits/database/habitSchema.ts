import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';



// Define this FIRST - it's referenced by activityLogs
export const activityPlans = sqliteTable('quran_activity_plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  activityType: text('activity_type', { enum: ['HIFZ', 'MURAJA', 'NORMAL_READING'] }).notNull(),
  localRefId: integer('local_ref_id'),
  title: text('title'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  status: text('status').notNull().default('active'),
  metadata: text('metadata'),
  remoteId: text('remote_id'),
  isSynced: integer('is_synced').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userTypeIdx: index('idx_quran_activity_plans_user_type').on(table.userId, table.activityType, table.status),
}));

// Define this SECOND - it references activityPlans
export const activityLogs = sqliteTable('quran_activity_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  date: text('date').notNull(),
  activityType: text('activity_type', { enum: ['HIFZ', 'MURAJA', 'NORMAL_READING'] }).notNull(),
  planId: integer('plan_id').references(() => activityPlans.id),
  localRefId: integer('local_ref_id'),
  minutesSpent: integer('minutes_spent').notNull().default(0),
  unitsCompleted: integer('units_completed').notNull().default(0),
  note: text('note'),
  metadata: text('metadata'),
  remoteId: text('remote_id'),
  isSynced: integer('is_synced').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userDateIdx: index('idx_quran_activity_logs_user_date').on(table.userId, table.date),
  syncIdx: index('idx_quran_activity_logs_sync').on(table.userId, table.isSynced),
  typeIdx: index('idx_quran_activity_logs_type').on(table.userId, table.activityType, table.date),
}));

export const weeklySummarySeen = sqliteTable('quran_weekly_summary_seen', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  weekKey: text('week_key').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const adaptiveGuidanceCache = sqliteTable('adaptive_guidance_cache', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().unique(),
  activityHash: text('activity_hash').notNull(),
  payload: text('payload').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const pageActivityLogs = sqliteTable('page_activity_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  pageId: integer('page_id').notNull(),
  source: text('source', { enum: ['hifz', 'muraja'] }).notNull(),
  sessionQuality: text('session_quality', { enum: ['perfect', 'medium', 'low'] }).notNull(),
  mistakesCount: integer('mistakes_count').default(0),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pageUserIdx: index('idx_page_activity_user_page').on(table.userId, table.pageId),
  createdAtIdx: index('idx_page_activity_created_at').on(table.createdAt),
}));
