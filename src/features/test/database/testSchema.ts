import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const testLogs = sqliteTable('test_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  planId: integer('plan_id'),
  type: text('type').notNull(),
  pagesRange: text('pages_range').notNull(),
  score: real('score').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  date: text('date').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userDateIdx: index('test_logs_user_date_idx').on(table.userId, table.date),
}));
