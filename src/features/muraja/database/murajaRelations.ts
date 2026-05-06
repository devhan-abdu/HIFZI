import { relations } from 'drizzle-orm';
import { weeklyMurajaPlans, dailyMurajaLogs } from './murajaSchema';

export const weeklyMurajaPlansRelations = relations(weeklyMurajaPlans, ({ many }) => ({
  daily_muraja_logs: many(dailyMurajaLogs),
}));

export const dailyMurajaLogsRelations = relations(dailyMurajaLogs, ({ one }) => ({
  weekly_plan: one(weeklyMurajaPlans, {
    fields: [dailyMurajaLogs.planId],
    references: [weeklyMurajaPlans.id],
  }),
}));
