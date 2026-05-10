import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '@/src/lib/db/local-client';
import { hifzPlans, hifzLogs } from '../database/hifzSchema';
import { activityPlans } from '../../habits/database/habitSchema';
import { supabase } from "@/src/lib/supabase";
import { IHifzLog, IHifzPlan } from "../types";
import {
  upsertHabitProgressLog,
  deleteHabitProgressLog,
  upsertActivityPlan,
} from "@/src/features/habits/services/habitProgressService";
import { PerformanceService } from "@/src/services/PerformanceService";
import { GamificationService } from "@/src/services/GamificationService";
import { notificationService } from "../../notifications/services/notificationService";
import { habitAnalyticsService } from "@/src/features/habits/services/habitAnalyticsService";
import { HabitRepository } from "@/src/features/habits/services/habitRepository";
import { habitStackingService } from "@/src/features/habits/services/habitStackingService";

import { PageMasteryService } from "@/src/services/PageMasteryService";
import { useCatalogStore } from "../../quran/store/catalogStore";
import { getPagesFromLog } from "../utils/quran-logic";

export const hifzService = {
  async createPlan(planData: Omit<IHifzPlan, "hifzDailyLogs" | "id"> & { userId: string }) {
    const userId = planData.userId;
    if (!userId) throw new Error("Missing user id");

    let localId = 0;
    
    await db.transaction(async (tx) => {
      await tx.update(hifzPlans)
        .set({ status: 'paused', syncStatus: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(hifzPlans.userId, userId), eq(hifzPlans.status, 'active')));

      const [newPlan] = await tx.insert(hifzPlans).values({
        userId,
        startSurah: planData.startSurah,
        startPage: planData.startPage,
        totalPages: planData.totalPages,
        pagesPerDay: planData.pagesPerDay,
        selectedDays: JSON.stringify(planData.selectedDays),
        daysPerWeek: planData.daysPerWeek,
        startDate: planData.startDate,
        estimatedEndDate: planData.estimatedEndDate,
        direction: planData.direction,
        status: planData.status ?? "active",
        preferredTime: planData.preferredTime,
        isCustomTime: planData.isCustomTime ?? false,
        isReinforcementEnabled: planData.isReinforcementEnabled ?? true,
        evaluationDay: planData.evaluationDay ?? 5,
        syncStatus: 0,
      }).returning({ id: hifzPlans.id });

      localId = newPlan.id;

      await upsertActivityPlan(tx as any, {
        userId,
        activityType: "HIFZ",
        status: "active",
        title: "Hifz Plan",
        startDate: planData.startDate,
        endDate: planData.estimatedEndDate,
        evaluationDay: planData.evaluationDay ?? 5,
        localRefId: localId,
        metadata: JSON.stringify({
          pagesPerDay: planData.pagesPerDay,
          startPage: planData.startPage,
          totalPages: planData.totalPages,
        }),
      });
    });

    if (planData.preferredTime) {
      void habitStackingService.scheduleReminders({
        id: localId,
        type: 'hifz',
        preferredTime: planData.preferredTime,
        isCustomTime: planData.isCustomTime ?? false,
        selectedDays: planData.selectedDays,
      });
    }

    void this.syncPending(userId);
    return localId;
  },

  async getPlan(userId: string, planId?: number): Promise<IHifzPlan | null> {
    if (!userId) return null;

    const localPlan = await db.query.hifzPlans.findFirst({
      where: planId 
        ? eq(hifzPlans.id, planId)
        : and(eq(hifzPlans.userId, userId), eq(hifzPlans.status, 'active')),
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
      userId: localPlan.userId,
      startSurah: localPlan.startSurah,
      startPage: localPlan.startPage,
      totalPages: localPlan.totalPages,
      pagesPerDay: localPlan.pagesPerDay,
      selectedDays: JSON.parse(localPlan.selectedDays ?? "[]"),
      daysPerWeek: localPlan.daysPerWeek,
      startDate: localPlan.startDate,
      estimatedEndDate: localPlan.estimatedEndDate,
      direction: localPlan.direction as "forward" | "backward",
      status: localPlan.status as any,
      preferredTime: localPlan.preferredTime ?? undefined,
      isCustomTime: localPlan.isCustomTime ?? undefined,
      isReinforcementEnabled: localPlan.isReinforcementEnabled ?? true,
      evaluationDay: localPlan.evaluationDay ?? 5,
      hifzDailyLogs: logs.map(l => ({
        id: l.id,
        hifzPlanId: l.hifzPlanId,
        actualStartPage: l.actualStartPage,
        actualEndPage: l.actualEndPage,
        actualPagesCompleted: l.actualPagesCompleted,
        date: l.date,
        logDay: l.logDay,
        status: l.status as any,
        notes: l.notes ?? undefined,
        mistakesCount: l.mistakesCount,
        hesitationCount: l.hesitationCount,
        qualityScore: l.qualityScore ?? undefined,
      })),
    };
  },

  async todayLog(userId: string, todayLog: IHifzLog, displayName?: string) {
    if (!userId) return;

    let localId = 0;
    let changed = false;
    let created = false;
    let previousStatus: IHifzLog["status"] | null = null;
    let rewards = null;

    await db.transaction(async (tx) => {
      const existing = await tx.query.hifzLogs.findFirst({
        where: and(
          eq(hifzLogs.userId, userId),
          eq(hifzLogs.hifzPlanId, todayLog.hifzPlanId),
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

          await PageMasteryService.syncPageActivityLogs(tx, userId, 'hifz', existing.id, todayLog.date, null, 'low');
          await PerformanceService.recomputeAllPerformance(tx, userId);

          await notificationService.removeHabitEvent(userId, 'hifz', todayLog.date);
          changed = true;
        }
        return;
      }

      const mCount = todayLog.mistakesCount ?? 0;
      const hCount = todayLog.hesitationCount ?? 0;

      if (!todayLog.qualityScore && (mCount > 0 || hCount > 0)) {
        let score = 5;
        if (mCount >= 4) score = 1;
        else if (mCount >= 2) score = 2;
        else if (mCount >= 1 || hCount >= 3) score = 3;
        else if (hCount >= 1) score = 4;
        todayLog.qualityScore = score;
      }

      const sameAsExisting = !!existing &&
        existing.actualStartPage === todayLog.actualStartPage &&
        existing.actualEndPage === todayLog.actualEndPage &&
        existing.actualPagesCompleted === todayLog.actualPagesCompleted &&
        existing.logDay === todayLog.logDay &&
        existing.status === todayLog.status &&
        existing.notes === (todayLog.notes ?? null) &&
        existing.mistakesCount === (todayLog.mistakesCount ?? 0) &&
        existing.hesitationCount === (todayLog.hesitationCount ?? 0) &&
        existing.qualityScore === (todayLog.qualityScore ?? null);

      if (sameAsExisting) {
        localId = existing.id;
        return;
      }

      const logValues = {
        userId,
        hifzPlanId: todayLog.hifzPlanId,
        actualStartPage: todayLog.actualStartPage,
        actualEndPage: todayLog.actualEndPage,
        actualPagesCompleted: todayLog.actualPagesCompleted,
        date: todayLog.date,
        logDay: todayLog.logDay,
        status: todayLog.status,
        notes: todayLog.notes ?? null,
        mistakesCount: todayLog.mistakesCount ?? 0,
        hesitationCount: todayLog.hesitationCount ?? 0,
        qualityScore: todayLog.qualityScore ?? null,
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

      const normalizedUnits = Math.max(0, Math.round(todayLog.actualPagesCompleted ?? 0));
      const isMissed = todayLog.status === "missed" || normalizedUnits === 0;

      await upsertHabitProgressLog(tx as any, {
        userId,
        date: todayLog.date,
        activityType: "HIFZ",
        minutesSpent: todayLog.actualMinutesSpent ?? (isMissed ? 0 : Math.max(1, normalizedUnits) * 3),
        unitsCompleted: isMissed ? 0 : normalizedUnits,
        note: todayLog.notes ?? null,
        planId: todayLog.hifzPlanId,
        localRefId: localId,
        eventType: isMissed ? "TASK_MISSED" : "HIFZ_COMPLETED",
        metadata: JSON.stringify({
          startPage: todayLog.actualStartPage,
          endPage: todayLog.actualEndPage,
          qualityScore: todayLog.qualityScore
        })
      });

      const qualityScore = todayLog.qualityScore ?? PerformanceService.deriveQualityScore(todayLog.mistakesCount ?? 0, todayLog.hesitationCount ?? 0);
      const quality: 'perfect' | 'medium' | 'low' = qualityScore >= 5 ? 'perfect' : qualityScore <= 2 ? 'low' : 'medium';

      const surahData = useCatalogStore.getState().surahs;
      const plan = await tx.query.hifzPlans.findFirst({
        where: eq(hifzPlans.id, todayLog.hifzPlanId)
      });
      const direction = (plan?.direction as 'forward' | 'backward') || 'forward';
      const pages = isMissed ? [] : getPagesFromLog(todayLog, direction, surahData);

      await PageMasteryService.syncPageActivityLogs(
        tx,
        userId,
        'hifz',
        localId,
        todayLog.date,
        isMissed ? null : pages,
        quality,
        todayLog.mistakesCount ?? 0,
        todayLog.hesitationCount ?? 0
      );

      if (!isMissed && pages.length > 0) {
        await PerformanceService.updatePagesPerformance(
          tx,
          userId,
          pages,
          qualityScore
        );
      } else {
        await PerformanceService.recomputeAllPerformance(tx, userId);
      }
      
      const { currentStreak } = await habitAnalyticsService.recalculateStreaks(userId);
      rewards = await GamificationService.processSessionCompletion(tx as any, userId, qualityScore, currentStreak);

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

    return { id: localId, changed, created, previousStatus, currentStatus: todayLog.status, rewards };
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
          is_reinforcement_enabled: plan.isReinforcementEnabled,
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
  },

  async completePlan(userId: string, planId: number) {
    await db.transaction(async (tx) => {
      await tx.update(hifzPlans)
        .set({ status: 'completed', syncStatus: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(hifzPlans.userId, userId), eq(hifzPlans.id, planId)));
      
      await tx.update(activityPlans)
        .set({ status: 'completed', updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(
          eq(activityPlans.userId, userId),
          eq(activityPlans.activityType, 'HIFZ'),
          eq(activityPlans.localRefId, planId)
        ));
    });
    
    void this.syncPending(userId);
  }
};
