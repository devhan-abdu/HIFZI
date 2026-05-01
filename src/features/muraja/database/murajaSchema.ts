import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const weeklyMurajaPlans = sqliteTable('weekly_muraja_plan', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  remoteId: text('remote_id'),
  userId: text('user_id'),
  weekStartDate: text('week_start_date'),
  weekEndDate: text('week_end_date'),
  plannedPagesPerDay: integer('planned_pages_per_day'),
  startPage: integer('start_page'),
  endPage: integer('end_page'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  selectedDays: text('selected_days'),
  syncStatus: integer('sync_status').default(1),
  estimatedTimeMin: integer('estimated_time_min'),
  place: text('place'),
  note: text('note'),
  preferredTime: text('preferred_time'),
  isCustomTime: integer('is_custom_time', { mode: 'boolean' }).default(false),
}, (table) => ({
  userIdIdx: index('idx_weekly_muraja_plan_user_id').on(table.userId),
  activeUserIdx: index('idx_weekly_muraja_plan_active_user').on(table.userId, table.isActive),
}));

export const dailyMurajaLogs = sqliteTable('daily_muraja_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  remoteId: text('remote_id'),
  planId: integer('plan_id').references(() => weeklyMurajaPlans.id),
  date: text('date'),
  completedPages: integer('completed_pages').default(0),
  actualTimeMin: integer('actual_time_min').default(0),
  status: text('status'), 
  isCatchup: integer('is_catchup', { mode: 'boolean' }).default(false),
  syncStatus: integer('sync_status').default(0),
  startPage: integer('start_page'),
  mistakesCount: integer('mistakes_count').notNull().default(0),
  hesitationCount: integer('hesitation_count').notNull().default(0),
  qualityScore: integer('quality_score'),
}, (table) => ({
  planDateIdx: index('idx_daily_muraja_logs_plan_date').on(table.planId, table.date),
  dateIdx: index('idx_daily_muraja_logs_date').on(table.date),
  syncIdx: index('idx_daily_muraja_logs_sync').on(table.syncStatus),
}));
