import { sqliteTable, text, integer, real, index, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const userStats = sqliteTable('user_stats', {
  userId: text('user_id').primaryKey(),
  murajaLastPage: integer('muraja_last_page').notNull().default(0),
  murajaCurrentStreak: integer('muraja_current_streak').notNull().default(0),
  hifzLastPage: integer('hifz_last_page').notNull().default(0),
  hifzCurrentStreak: integer('hifz_current_streak').notNull().default(0),
  globalLongestStreak: integer('global_longest_streak').notNull().default(0),
  totalXp: integer('total_xp').notNull().default(0),
  level: integer('level').notNull().default(0),
  lastNotifiedAt: text('last_notified_at'),
  lastActivityDate: text('last_activity_date'),
  hasRecoveryShield: integer('has_recovery_shield', { mode: 'boolean' }).default(false),
  lastTestDate: text('last_test_date'),
  consecutivePerfects: integer('consecutive_perfects').notNull().default(0),
});

export const userBadges = sqliteTable('user_badges', {
  badgeId: text('badge_id').primaryKey(),
  userId: text('user_id').notNull(),
  badgeType: text('badge_type').notNull(),
  achievedAt: text('achieved_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  metadata: text('metadata'),
}, (table) => ({
  userIdx: index('idx_user_badges_user').on(table.userId),
}));

export const pagePerformance = sqliteTable('page_performance', {
  pageNumber: integer('page_number').notNull(),
  userId: text('user_id').notNull().default('unknown'),
  strength: real('strength').notNull().default(0.0),
  lastReviewedAt: text('last_reviewed_at'),
  nextReviewAt: text('next_review_at'),
  stability: real('stability').notNull().default(1.0),
  difficulty: real('difficulty').notNull().default(1.0),
  consecutivePerfects: integer('consecutive_perfects').notNull().default(0),
  lastSessionQuality: text('last_session_quality', { enum: ['perfect', 'medium', 'low'] }),
  lastMistakesCount: integer('last_mistakes_count').default(0),
  lastHesitationsCount: integer('last_hesitations_count').default(0),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.pageNumber] }),
}));
