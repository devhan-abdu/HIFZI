import { eq, and, sql, max, desc } from 'drizzle-orm';
import { db } from '@/src/lib/db/local-client';
import { weeklyMurajaPlans, dailyMurajaLogs } from '../database/murajaSchema';
import { IDailyMurajaLog, IWeeklyMurajaPLan } from "../types";
import { PerformanceService } from "@/src/services/PerformanceService";
import { GamificationService } from "@/src/services/GamificationService";
import { PageMasteryService } from "@/src/services/PageMasteryService";
import { insertHabitProgressLog, deleteHabitProgressLog } from "../../habits/services/habitProgressService";
import { supabase } from "@/src/lib/supabase";
import { notificationService } from "../../notifications/services/notificationService";

import { userStats } from '../../user/database/userSchema';
import { habitStackingService } from '../../habits/services/habitStackingService';

export type LocalMurajaLogWriteResult = {
  localLogId: number | null;
  changed: boolean;
  created: boolean;
  previousStatus: IDailyMurajaLog["status"] | null;
  currentStatus: IDailyMurajaLog["status"] | "pending" | null;
};

export const murajaService = {
  async createPlan(planData: Omit<IWeeklyMurajaPLan, "id">) {
    let lastId = 0;
    
    await db.transaction(async (tx) => {
      await tx.update(weeklyMurajaPlans)
        .set({ isActive: false })
        .where(and(eq(weeklyMurajaPlans.userId, planData.user_id), eq(weeklyMurajaPlans.isActive, true)));

      const [newPlan] = await tx.insert(weeklyMurajaPlans).values({
        userId: planData.user_id,
        weekStartDate: planData.week_start_date,
        weekEndDate: planData.week_end_date,
        plannedPagesPerDay: planData.planned_pages_per_day,
        startPage: planData.start_page,
        endPage: planData.end_page,
        isActive: true,
        selectedDays: planData.selected_days,
        syncStatus: 0,
        estimatedTimeMin: planData.estimated_time_min,
        place: planData.place ?? null,
        note: planData.note ?? null,
        preferredTime: planData.preferred_time,
        isCustomTime: planData.is_custom_time ?? false,
      }).returning({ id: weeklyMurajaPlans.id });

      lastId = newPlan.id;

      await tx.insert(userStats)
        .values({ userId: planData.user_id, murajaLastPage: planData.start_page - 1 })
        .onConflictDoUpdate({
          target: userStats.userId,
          set: { murajaLastPage: planData.start_page - 1 }
        });
    });

    if (planData.preferred_time) {
      void habitStackingService.scheduleReminders({
        id: lastId,
        type: 'muraja',
        preferredTime: planData.preferred_time,
        isCustomTime: planData.is_custom_time ?? false,
        selectedDays: JSON.parse(planData.selected_days),
      });
    }

    void this.syncPending(planData.user_id);
    return lastId;
  },

  async getDashboardState(userId: string) {
    const plan = await db.query.weeklyMurajaPlans.findFirst({
      where: and(eq(weeklyMurajaPlans.userId, userId), eq(weeklyMurajaPlans.isActive, true)),
      orderBy: [desc(weeklyMurajaPlans.id)],
    });

    if (!plan) return;

    const stats = await db.query.userStats.findFirst({
      where: eq(userStats.userId, userId),
    });

    const logs = await db.query.dailyMurajaLogs.findMany({
      where: eq(dailyMurajaLogs.planId, plan.id),
      orderBy: [dailyMurajaLogs.date],
    });

    return {
      ...plan,
      preferred_time: plan.preferredTime ?? undefined,
      is_custom_time: plan.isCustomTime ?? undefined,
      muraja_last_page: stats?.murajaLastPage ?? 0,
      muraja_current_streak: stats?.murajaCurrentStreak ?? 0,
      daily_logs: logs.map(l => ({
        id: l.id,
        remote_id: l.remoteId,
        plan_id: l.planId,
        date: l.date,
        completed_pages: l.completedPages,
        actual_time_min: l.actualTimeMin,
        status: l.status as any,
        is_catchup: l.isCatchup,
        sync_status: l.syncStatus,
        start_page: l.startPage,
        mistakes_count: l.mistakesCount,
        hesitation_count: l.hesitationCount,
        quality_score: l.qualityScore,
      })),
    };
  },

  async upsertLog(userId: string, log: IDailyMurajaLog, displayName?: string): Promise<LocalMurajaLogWriteResult> {
    let localLogId: number | null = null;
    let changed = false;
    let created = false;
    let previousStatus: IDailyMurajaLog["status"] | null = null;
    let currentStatus: IDailyMurajaLog["status"] | "pending" | null = null;

    await db.transaction(async (tx) => {
      const existing = await tx.query.dailyMurajaLogs.findFirst({
        where: and(
          eq(dailyMurajaLogs.date, log.date ?? ''),
          eq(dailyMurajaLogs.planId, log.plan_id)
        )
      });

      previousStatus = (existing?.status as any) ?? null;

      if (log.status === "pending" && (log.completed_pages ?? 0) <= 0) {
        if (existing?.id) {
          await tx.delete(dailyMurajaLogs).where(eq(dailyMurajaLogs.id, existing.id));
          await deleteHabitProgressLog(tx as any, {
            userId,
            activityType: 'review',
            localRefId: existing.id
          });
          await notificationService.removeHabitEvent(userId, 'muraja', log.date ?? '');
          localLogId = existing.id;
          changed = true;
          currentStatus = "pending";
        }

        const plan = await tx.query.weeklyMurajaPlans.findFirst({
          where: eq(weeklyMurajaPlans.id, log.plan_id),
        });

        const latestLog = await tx.query.dailyMurajaLogs.findFirst({
          where: and(eq(dailyMurajaLogs.planId, log.plan_id), sql`${dailyMurajaLogs.completedPages} > 0`),
          orderBy: [desc(dailyMurajaLogs.date)],
        });

        const fallbackPage = (plan?.startPage ?? 1) - 1;
        const progressPage = latestLog ? (latestLog.startPage ?? 0) + (latestLog.completedPages ?? 0) - 1 : fallbackPage;

        await tx.insert(userStats)
          .values({ userId, murajaLastPage: progressPage })
          .onConflictDoUpdate({
            target: userStats.userId,
            set: { murajaLastPage: progressPage }
          });
        return;
      }

      const sameAsExisting = !!existing &&
        existing.completedPages === log.completed_pages &&
        existing.status === log.status &&
        existing.actualTimeMin === log.actual_time_min &&
        existing.isCatchup === Boolean(log.is_catchup) &&
        existing.startPage === log.start_page &&
        existing.mistakesCount === (log.mistakes_count ?? 0) &&
        existing.hesitationCount === (log.hesitation_count ?? 0) &&
        existing.qualityScore === (log.quality_score ?? null);

      if (sameAsExisting) {
        localLogId = existing.id;
        currentStatus = existing.status as any;
        return;
      }

      const logValues = {
        date: log.date,
        planId: log.plan_id,
        startPage: log.start_page,
        completedPages: log.completed_pages,
        syncStatus: 0,
        isCatchup: Boolean(log.is_catchup),
        actualTimeMin: log.actual_time_min,
        status: log.status,
        mistakesCount: log.mistakes_count ?? 0,
        hesitationCount: log.hesitation_count ?? 0,
        qualityScore: log.quality_score ?? null,
        remoteId: null,
      };

      if (existing) {
        await tx.update(dailyMurajaLogs).set(logValues).where(eq(dailyMurajaLogs.id, existing.id));
        localLogId = existing.id;
        changed = true;
      } else {
        const [newLog] = await tx.insert(dailyMurajaLogs).values(logValues).returning({ id: dailyMurajaLogs.id });
        localLogId = newLog.id;
        changed = true;
        created = true;
      }

      currentStatus = log.status as any;

      await tx.insert(userStats)
        .values({ userId, murajaLastPage: (log.start_page ?? 0) + (log.completed_pages ?? 0) - 1 })
        .onConflictDoUpdate({
          target: userStats.userId,
          set: { murajaLastPage: (log.start_page ?? 0) + (log.completed_pages ?? 0) - 1 }
        });

      const isMissed = log.status === "missed" || (log.completed_pages ?? 0) === 0;
      const normalizedUnits = Math.max(0, Math.round(log.completed_pages ?? 0));

      await insertHabitProgressLog(tx as any, {
        userId,
        date: log.date,
        activityType: "MURAJA",
        minutesSpent: isMissed ? 0 : (log.actual_time_min ?? 0),
        unitsCompleted: isMissed ? 0 : normalizedUnits,
        note: null,
        planId: log.plan_id,
        localRefId: localLogId,
        eventType: isMissed ? "TASK_MISSED" : "MURAJA_COMPLETED",
      });

      const stats = await tx.query.userStats.findFirst({
        where: eq(userStats.userId, userId),
        columns: { murajaCurrentStreak: true }
      });
      const currentStreak = stats?.murajaCurrentStreak ?? 0;

      if ((log.completed_pages ?? 0) > 0) {
        const qualityScore = log.quality_score ?? PerformanceService.deriveQualityScore(log.mistakes_count ?? 0, log.hesitation_count ?? 0);
        
        // Map quality score to PageMastery categories
        let sessionQuality: 'perfect' | 'medium' | 'low' = 'medium';
        if (qualityScore >= 5) sessionQuality = 'perfect';
        else if (qualityScore <= 2) sessionQuality = 'low';

        await PageMasteryService.logPageRangeActivity(
          userId,
          log.start_page ?? 0,
          (log.start_page ?? 0) + (log.completed_pages ?? 0) - 1,
          'muraja',
          sessionQuality,
          Math.ceil((log.mistakes_count ?? 0) / Math.max(1, log.completed_pages ?? 1))
        );

        await PerformanceService.updateRangePerformance(
          tx as any,
          log.start_page ?? 0,
          (log.start_page ?? 0) + (log.completed_pages ?? 0) - 1,
          qualityScore
        );

        await GamificationService.processSessionCompletion(tx as any, userId, qualityScore, currentStreak);
      }

      if (changed && currentStatus !== "pending" && (log.status === "completed" || log.status === "partial" || log.status === "missed")) {
        await notificationService.processHabitEvent({
          userId,
          displayName: displayName || "Hafiz",
          habitType: "muraja",
          status: log.status as any,
          date: log.date,
        });
      }
    });

    if (changed) {
      void this.syncPending(userId);
    }

    return { localLogId, changed, created, previousStatus, currentStatus };
  },

  async syncPending(userId: string) {
    try {
      const pendingPlans = await db.query.weeklyMurajaPlans.findMany({
        where: and(eq(weeklyMurajaPlans.userId, userId), eq(weeklyMurajaPlans.syncStatus, 0)),
      });

      for (const plan of pendingPlans) {
        const payload = {
          user_id: plan.userId,
          week_start_date: plan.weekStartDate,
          week_end_date: plan.weekEndDate,
          planned_pages_per_day: plan.plannedPagesPerDay,
          start_page: plan.startPage,
          end_page: plan.endPage,
          is_active: plan.isActive,
          selected_days: plan.selectedDays,
          estimated_time_min: plan.estimatedTimeMin,
          place: plan.place,
          note: plan.note,
          preferred_time: plan.preferredTime,
          is_custom_time: plan.isCustomTime,
        };

        const { data, error } = await supabase
          .from("weekly_muraja_plan")
          .upsert({ ...payload, local_id: plan.id }, { onConflict: "user_id,local_id" })
          .select("id")
          .single();

        if (error) throw error;

        await db.update(weeklyMurajaPlans)
          .set({ syncStatus: 1, remoteId: data?.id ? String(data.id) : null })
          .where(eq(weeklyMurajaPlans.id, plan.id));
      }

      const pendingLogs = await db.query.dailyMurajaLogs.findMany({
        where: and(eq(dailyMurajaLogs.syncStatus, 0)),
      });

      for (const log of pendingLogs) {
        if (!log.planId) continue;

        const plan = await db.query.weeklyMurajaPlans.findFirst({
          where: eq(weeklyMurajaPlans.id, log.planId),
        });

        if (!plan || plan.userId !== userId) continue;

        const remotePlanId = plan.remoteId ? Number(plan.remoteId) : null;
        if (!remotePlanId) continue; 

        const { data, error } = await supabase
          .from("daily_muraja_logs")
          .upsert({
            plan_id: remotePlanId,
            date: log.date,
            completed_pages: log.completedPages,
            actual_time_min: log.actualTimeMin,
            status: log.status,
            is_catchup: log.isCatchup,
            start_page: log.startPage,
            mistakes_count: log.mistakesCount,
            hesitation_count: log.hesitationCount,
            quality_score: log.qualityScore,
            local_id: log.id,
            user_id: userId,
          }, { onConflict: "user_id,plan_id,date" })
          .select("id")
          .single();

        if (error) throw error;

        await db.update(dailyMurajaLogs)
          .set({ syncStatus: 1, remoteId: data?.id ? String(data.id) : null })
          .where(eq(dailyMurajaLogs.id, log.id));
      }
    } catch (e) {
      console.warn("Muraja sync failed", e);
    }
  },

  async getReviewStats(userId: string, planId?: number) {
    const conditions = [
      eq(weeklyMurajaPlans.userId, userId),
      eq(weeklyMurajaPlans.isActive, false)
    ];
    if (planId) {
      conditions.push(eq(weeklyMurajaPlans.id, planId));
    }

    const plan = await db.query.weeklyMurajaPlans.findFirst({
      where: and(...conditions),
      orderBy: [desc(weeklyMurajaPlans.weekEndDate)],
    });

    if (!plan) return null;

    const logs = await db.query.dailyMurajaLogs.findMany({
      where: eq(dailyMurajaLogs.planId, plan.id),
      orderBy: [dailyMurajaLogs.date],
    });

    return {
      ...plan,
      daily_logs: logs.map(l => ({
        id: l.id,
        remote_id: l.remoteId,
        plan_id: l.planId,
        date: l.date,
        completed_pages: l.completedPages,
        actual_time_min: l.actualTimeMin,
        status: l.status,
        is_catchup: l.isCatchup,
        sync_status: l.syncStatus,
        start_page: l.startPage,
        mistakes_count: l.mistakesCount,
        hesitation_count: l.hesitationCount,
        quality_score: l.qualityScore,
      })),
    };
  }
};
