import { sqliteTable, text, integer, real, index, unique } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const hifzPlans = sqliteTable('hifz_plans_local', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  remoteId: text('remote_id'),
  userId: text('user_id').notNull(),
  startSurah: integer('start_surah').notNull(),
  startPage: integer('start_page').notNull(),
  totalPages: integer('total_pages').notNull(),
  pagesPerDay: real('pages_per_day').notNull(),
  selectedDays: text('selected_days').notNull(),
  daysPerWeek: integer('days_per_week').notNull(),
  startDate: text('start_date').notNull(),
  estimatedEndDate: text('estimated_end_date').notNull(),
  direction: text('direction').notNull(),
  status: text('status').notNull().default('active'),
  syncStatus: integer('sync_status').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  preferredTime: text('preferred_time'),
  isCustomTime: integer('is_custom_time', { mode: 'boolean' }).default(false),
}, (table) => ({
  userStatusIdx: index('idx_hifz_plans_local_user').on(table.userId, table.status),
  userIdIdx: index('idx_hifz_plans_local_user_id').on(table.userId),
  syncIdx: index('idx_hifz_plans_local_sync').on(table.syncStatus),
}));

export const hifzLogs = sqliteTable('hifz_logs_local', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  remoteId: text('remote_id'),
  userId: text('user_id').notNull(),
  hifzPlanId: integer('hifz_plan_id').notNull(),
  actualStartPage: integer('actual_start_page').notNull(),
  actualEndPage: integer('actual_end_page').notNull(),
  actualPagesCompleted: integer('actual_pages_completed').notNull(),
  date: text('date').notNull(),
  logDay: integer('log_day').notNull(),
  status: text('status').notNull(),
  notes: text('notes'),
  mistakesCount: integer('mistakes_count').notNull().default(0),
  hesitationCount: integer('hesitation_count').notNull().default(0),
  qualityScore: integer('quality_score'),
  syncStatus: integer('sync_status').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userPlanDateUnique: unique('idx_hifz_logs_local_user_plan_date').on(table.userId, table.hifzPlanId, table.date),
  dateIdx: index('idx_hifz_logs_local_date').on(table.date),
  syncIdx: index('idx_hifz_logs_local_sync').on(table.syncStatus),
}));
