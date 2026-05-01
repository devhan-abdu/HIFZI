import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '@/src/lib/db/local-client';
import { hifzPlans, hifzLogs } from '../database/hifzSchema';
import { supabase } from "@/src/lib/supabase";
import { IHifzLog, IHifzPlan } from "../types";
import {
  insertHabitProgressLog,
  deleteHabitProgressLog,
  upsertActivityPlan,
} from "@/src/features/habits/services/habitProgressService";
import { PerformanceService } from "@/src/services/PerformanceService";
import { GamificationService } from "@/src/services/GamificationService";
import { userStats } from "@/src/features/user/database/userSchema";
import { notificationService } from "../../notifications/services/notificationService";
import { HabitRepository } from "@/src/features/habits/services/habitRepository";
import { habitStackingService } from "@/src/features/habits/services/habitStackingService";

import { PageMasteryService } from "@/src/services/PageMasteryService";

export const hifzService = {
  async createPlan(planData: Omit<IHifzPlan, "hifz_daily_logs" | "id"> & { user_id: string }) {
    const userId = planData.user_id;
    if (!userId) throw new Error("Missing user id");

    let localId = 0;
    
    await db.transaction(async (tx) => {
      await tx.update(hifzPlans)
        .set({ status: 'paused', syncStatus: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(hifzPlans.userId, userId), eq(hifzPlans.status, 'active')));

      const [newPlan] = await tx.insert(hifzPlans).values({
        userId,
        startSurah: planData.start_surah,
        startPage: planData.start_page,
        totalPages: planData.total_pages,
        pagesPerDay: planData.pages_per_day,
        selectedDays: JSON.stringify(planData.selected_days),
        daysPerWeek: planData.days_per_week,
        startDate: planData.start_date,
        estimatedEndDate: planData.estimated_end_date,
        direction: planData.direction,
        status: planData.status ?? "active",
        preferredTime: planData.preferred_time,
        isCustomTime: planData.is_custom_time ?? false,
        syncStatus: 0,
      }).returning({ id: hifzPlans.id });

      localId = newPlan.id;

      await upsertActivityPlan(tx as any, {
        userId,
        activityType: "HIFZ",
        status: "active",
        title: "Hifz Plan",
        startDate: planData.start_date,
        endDate: planData.estimated_end_date,
        localRefId: localId,
        metadata: JSON.stringify({
          pages_per_day: planData.pages_per_day,
          start_page: planData.start_page,
          total_pages: planData.total_pages,
        }),
      });
    });

    if (planData.preferred_time) {
      void habitStackingService.scheduleReminders({
        id: localId,
        type: 'hifz',
        preferredTime: planData.preferred_time,
        isCustomTime: planData.is_custom_time ?? false,
        selectedDays: planData.selected_days,
      });
    }

    void this.syncPending(userId);
    return localId;
  },

  async getPlan(userId: string): Promise<IHifzPlan | null> {
    if (!userId) return null;

    const localPlan = await db.query.hifzPlans.findFirst({
      where: and(eq(hifzPlans.userId, userId), eq(hifzPlans.status, 'active')),
      orderBy: [desc(hifzPlans.id)],
    });

    if (!localPlan) return null;

    const logs = await db.query.hifzLogs.findMany({
      where: and(eq(hifzLogs.userId, userId), eq(hifzLogs.hifzPlanId, localPlan.id)),
      orderBy: [hifzLogs.date],
    });

    void this.syncPending(userId);

    return {
      id: localPlan.id,
      user_id: localPlan.userId,
      start_surah: localPlan.startSurah,
      start_page: localPlan.startPage,
      total_pages: localPlan.totalPages,
      pages_per_day: localPlan.pagesPerDay,
      selected_days: JSON.parse(localPlan.selectedDays ?? "[]"),
      days_per_week: localPlan.daysPerWeek,
      start_date: localPlan.startDate,
      estimated_end_date: localPlan.estimatedEndDate,
      direction: localPlan.direction as "forward" | "backward",
      status: localPlan.status as any,
      preferred_time: localPlan.preferredTime ?? undefined,
      is_custom_time: localPlan.isCustomTime ?? undefined,
      hifz_daily_logs: logs.map(l => ({
        id: l.id,
        hifz_plan_id: l.hifzPlanId,
        actual_start_page: l.actualStartPage,
        actual_end_page: l.actualEndPage,
        actual_pages_completed: l.actualPagesCompleted,
        date: l.date,
        log_day: l.logDay,
        status: l.status as any,
        notes: l.notes ?? undefined,
        mistakes_count: l.mistakesCount,
        hesitation_count: l.hesitationCount,
        quality_score: l.qualityScore ?? undefined,
      })),
    };
  },

  async todayLog(userId: string, todayLog: IHifzLog, displayName?: string) {
    if (!userId) return;

    let localId = 0;
    let changed = false;
    let created = false;
    let previousStatus: IHifzLog["status"] | null = null;

    await db.transaction(async (tx) => {
      const existing = await tx.query.hifzLogs.findFirst({
        where: and(
          eq(hifzLogs.userId, userId),
          eq(hifzLogs.hifzPlanId, todayLog.hifz_plan_id),
          eq(hifzLogs.date, todayLog.date)
        )
      });

      previousStatus = (existing?.status as any) ?? null;

      if (todayLog.status === ("pending" as any)) {
        if (existing) {
          await tx.delete(hifzLogs).where(eq(hifzLogs.id, existing.id));
          await deleteHabitProgressLog(tx as any, {
            userId,
            activityType: 'hifz',
            localRefId: existing.id
          });
          await notificationService.removeHabitEvent(userId, 'hifz', todayLog.date);
          changed = true;
        }
        return;
      }

      const mCount = todayLog.mistakes_count ?? 0;
      const hCount = todayLog.hesitation_count ?? 0;

      if (!todayLog.quality_score && (mCount > 0 || hCount > 0)) {
        let score = 5;
        if (mCount >= 4) score = 1;
        else if (mCount >= 2) score = 2;
        else if (mCount >= 1 || hCount >= 3) score = 3;
        else if (hCount >= 1) score = 4;
        todayLog.quality_score = score;
      }

      const sameAsExisting = !!existing &&
        existing.actualStartPage === todayLog.actual_start_page &&
        existing.actualEndPage === todayLog.actual_end_page &&
        existing.actualPagesCompleted === todayLog.actual_pages_completed &&
        existing.logDay === todayLog.log_day &&
        existing.status === todayLog.status &&
        existing.notes === (todayLog.notes ?? null) &&
        existing.mistakesCount === (todayLog.mistakes_count ?? 0) &&
        existing.hesitationCount === (todayLog.hesitation_count ?? 0) &&
        existing.qualityScore === (todayLog.quality_score ?? null);

      if (sameAsExisting) {
        localId = existing.id;
        return;
      }

      const logValues = {
        userId,
        hifzPlanId: todayLog.hifz_plan_id,
        actualStartPage: todayLog.actual_start_page,
        actualEndPage: todayLog.actual_end_page,
        actualPagesCompleted: todayLog.actual_pages_completed,
        date: todayLog.date,
        logDay: todayLog.log_day,
        status: todayLog.status,
        notes: todayLog.notes ?? null,
        mistakesCount: todayLog.mistakes_count ?? 0,
        hesitationCount: todayLog.hesitation_count ?? 0,
        qualityScore: todayLog.quality_score ?? null,
        syncStatus: 0,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      };

      if (existing) {
        await tx.update(hifzLogs).set(logValues).where(eq(hifzLogs.id, existing.id));
        localId = existing.id;
      } else {
        const [newLog] = await tx.insert(hifzLogs).values(logValues).returning({ id: hifzLogs.id });
        localId = newLog.id;
        created = true;
      }

      changed = true;

      const normalizedUnits = Math.max(0, Math.round(todayLog.actual_pages_completed ?? 0));
      const isMissed = todayLog.status === "missed" || normalizedUnits === 0;

      await insertHabitProgressLog(tx as any, {
        userId,
        date: todayLog.date,
        activityType: "HIFZ",
        minutesSpent: todayLog.actual_minutes_spent ?? (isMissed ? 0 : Math.max(1, normalizedUnits) * 3),
        unitsCompleted: isMissed ? 0 : normalizedUnits,
        note: todayLog.notes ?? null,
        planId: todayLog.hifz_plan_id,
        localRefId: localId,
        eventType: isMissed ? "TASK_MISSED" : "HIFZ_COMPLETED",
      });

      if (!isMissed && todayLog.actual_pages_completed > 0) {
        const qualityScore = todayLog.quality_score ?? PerformanceService.deriveQualityScore(todayLog.mistakes_count ?? 0, todayLog.hesitation_count ?? 0);
        
        // Map quality score to PageMastery categories
        let sessionQuality: 'perfect' | 'medium' | 'low' = 'medium';
        if (qualityScore >= 5) sessionQuality = 'perfect';
        else if (qualityScore <= 2) sessionQuality = 'low';

        await PageMasteryService.logPageRangeActivity(
          userId,
          todayLog.actual_start_page,
          todayLog.actual_end_page,
          'hifz',
          sessionQuality,
          Math.ceil((todayLog.mistakes_count ?? 0) / Math.max(1, todayLog.actual_pages_completed))
        );

        await PerformanceService.updateRangePerformance(tx as any, todayLog.actual_start_page, todayLog.actual_end_page, qualityScore);
        
        const stats = await tx.query.userStats.findFirst({
          where: eq(userStats.userId, userId),
          columns: { hifzCurrentStreak: true }
        });
        const currentStreak = stats?.hifzCurrentStreak ?? 0;

        await GamificationService.processSessionCompletion(tx as any, userId, qualityScore, currentStreak);
      }

      if (changed && (todayLog.status === "completed" || todayLog.status === "partial" || todayLog.status === "missed")) {
        await notificationService.processHabitEvent({
          userId,
          displayName: displayName || "Hafiz",
          habitType: "hifz",
          status: todayLog.status as any,
          date: todayLog.date,
        });
      }
    });

    if (changed) {
      void this.syncPending(userId);
      void new HabitRepository().syncPendingLogs(userId).catch(e => console.warn(e));
    }

    return { id: localId, changed, created, previousStatus, currentStatus: todayLog.status };
  },

  async syncPending(userId: string) {
    try {
      const pendingPlans = await db.query.hifzPlans.findMany({
        where: and(eq(hifzPlans.userId, userId), eq(hifzPlans.syncStatus, 0)),
      });

      for (const plan of pendingPlans) {
        const payload = {
          user_id: plan.userId,
          start_surah: plan.startSurah,
          start_page: plan.startPage,
          total_pages: plan.totalPages,
          pages_per_day: plan.pagesPerDay,
          selected_days: JSON.parse(plan.selectedDays ?? "[]"),
          days_per_week: plan.daysPerWeek,
          start_date: plan.startDate,
          estimated_end_date: plan.estimatedEndDate,
          direction: plan.direction,
          status: plan.status,
          preferred_time: plan.preferredTime,
          is_custom_time: plan.isCustomTime,
        };

        const { data, error } = await supabase
          .from("hifz_plan")
          .upsert({ ...payload, local_id: plan.id }, { onConflict: "user_id,local_id" })
          .select("id")
          .single();

        if (error) throw error;

        await db.update(hifzPlans)
          .set({ syncStatus: 1, remoteId: data?.id ? String(data.id) : null, updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(hifzPlans.id, plan.id));
      }

      const pendingLogs = await db.query.hifzLogs.findMany({
        where: and(eq(hifzLogs.userId, userId), eq(hifzLogs.syncStatus, 0)),
      });

      for (const log of pendingLogs) {
        const plan = await db.query.hifzPlans.findFirst({
          where: eq(hifzPlans.id, log.hifzPlanId),
        });

        const hifzPlanId = Number(plan?.remoteId ?? log.hifzPlanId);

        const { data, error } = await supabase
          .from("hifz_daily_logs")
          .upsert({
            user_id: log.userId,
            hifz_plan_id: hifzPlanId,
            actual_start_page: log.actualStartPage,
            actual_end_page: log.actualEndPage,
            actual_pages_completed: log.actualPagesCompleted,
            date: log.date,
            log_day: log.logDay,
            status: log.status,
            notes: log.notes,
            mistakes_count: log.mistakesCount,
            hesitation_count: log.hesitationCount,
            quality_score: log.qualityScore,
            local_id: log.id,
          }, { onConflict: "user_id,hifz_plan_id,date" })
          .select("id")
          .single();

        if (error) throw error;

        await db.update(hifzLogs)
          .set({ syncStatus: 1, remoteId: data?.id ? String(data.id) : null, updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(hifzLogs.id, log.id));
      }
    } catch (e) {
      console.warn("Hifz sync failed", e);
    }
  }
};
