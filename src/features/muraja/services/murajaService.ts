import { eq, and, sql, desc, isNull, asc, gte, lte } from 'drizzle-orm';
import { db } from '@/src/lib/db/local-client';
import { weeklyMurajaPlans, dailyMurajaLogs } from '../database/murajaSchema';
import { activityPlans } from '../../habits/database/habitSchema';
import { IDailyMurajaLog, IWeeklyMurajaPLan } from "../types";
import { PerformanceService } from "@/src/services/PerformanceService";
import { GamificationService } from "@/src/services/GamificationService";
import { PageMasteryService } from "@/src/services/PageMasteryService";
import { upsertHabitProgressLog, deleteHabitProgressLog, upsertActivityPlan } from "../../habits/services/habitProgressService";
import { notificationService } from "../../notifications/services/notificationService";

import { userStats } from '../../user/database/userSchema';
import { habitStackingService } from '../../habits/services/habitStackingService';
import { getLocalDateString } from '../utils/murajaAnalytics';
import { calculateMurajaFinishedDate } from '../utils/plan-calculations';
export type LocalMurajaLogWriteResult = {
  localLogId: number | null;
  changed: boolean;
  created: boolean;
  previousStatus: IDailyMurajaLog["status"] | null;
  currentStatus: IDailyMurajaLog["status"] | "pending" | null;
  rewards?: any;
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
        evaluationDay: planData.evaluationDay ?? 5,
      }).returning({ id: weeklyMurajaPlans.id });

      lastId = newPlan.id;

      await upsertActivityPlan(tx as any, {
        userId: planData.user_id,
        activityType: "MURAJA",
        status: "active",
        title: "Muraja Plan",
        startDate: planData.week_start_date,
        endDate: planData.week_end_date,
        evaluationDay: planData.evaluationDay ?? 5,
        localRefId: lastId,
        metadata: JSON.stringify({
          planned_pages_per_day: planData.planned_pages_per_day,
          start_page: planData.start_page,
          end_page: planData.end_page,
        })
      });

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

  async updatePlan(planId: number, planData: Partial<IWeeklyMurajaPLan>) {
    await db.transaction(async (tx) => {
      await tx.update(weeklyMurajaPlans)
        .set({
          plannedPagesPerDay: planData.planned_pages_per_day,
          selectedDays: planData.selected_days,
          weekEndDate: planData.week_end_date,
          estimatedTimeMin: planData.estimated_time_min,
          place: planData.place ?? null,
          note: planData.note ?? null,
          preferredTime: planData.preferred_time,
          isCustomTime: planData.is_custom_time ?? false,
          evaluationDay: planData.evaluationDay ?? 5,
        })
        .where(eq(weeklyMurajaPlans.id, planId));

      await upsertActivityPlan(tx as any, {
        userId: planData.user_id as string,
        activityType: "MURAJA",
        localRefId: planId,
        endDate: planData.week_end_date,
        evaluationDay: planData.evaluationDay ?? 5,
        metadata: JSON.stringify({
          planned_pages_per_day: planData.planned_pages_per_day,
          start_page: planData.start_page,
          end_page: planData.end_page,
        })
      });
    });

    if (planData.preferred_time) {
      void habitStackingService.scheduleReminders({
        id: planId,
        type: 'muraja',
        preferredTime: planData.preferred_time,
        isCustomTime: planData.is_custom_time ?? false,
        selectedDays: JSON.parse(planData.selected_days as string),
      });
    }

    if (planData.user_id) {
      void this.syncPending(planData.user_id);
    }
    return planId;
  },

  async getDashboardState(userId: string) {

    let plan = await db.query.weeklyMurajaPlans.findFirst({
      where: and(eq(weeklyMurajaPlans.userId, userId), eq(weeklyMurajaPlans.isActive, true)),
      orderBy: [desc(weeklyMurajaPlans.id)],
    });

    if (!plan) {
      plan = await db.query.weeklyMurajaPlans.findFirst({
        where: eq(weeklyMurajaPlans.userId, userId),
        orderBy: [desc(weeklyMurajaPlans.id)],
      });
    }

    if (!plan) return null;

    const stats = await db.query.userStats.findFirst({
      where: eq(userStats.userId, userId),
    });

      const todayStr = getLocalDateString(new Date());


    const logs = await db.query.dailyMurajaLogs.findMany({
      where: eq(dailyMurajaLogs.planId, plan.id),
      orderBy: [dailyMurajaLogs.date],
    });

    const todayLog = logs.find(l => l.date === todayStr) ?? null

      const activityPlan = await db.query.activityPlans.findFirst({
      where: and(
        eq(activityPlans.userId, userId),
        eq(activityPlans.localRefId, plan.id),
        eq(activityPlans.activityType, 'MURAJA')
      )
      });
    
    const todayDay = (new Date().getDay() + 6) % 7;
    const isEvaluationDay = todayDay === plan.evaluationDay;
    const alreadyEvaluatedThisWeek = activityPlan?.lastEvaluationDate === todayStr;

    let evaluationDue = false;
    if (isEvaluationDay && !alreadyEvaluatedThisWeek) {
      const activeDaysArr: number[] = typeof plan.selectedDays === 'string'
        ? JSON.parse(plan.selectedDays || '[]')
        : plan.selectedDays ?? [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfWeek = new Date(today);
      const todayDayIdx = (today.getDay() + 6) % 7;
      startOfWeek.setDate(today.getDate() - todayDayIdx);
      const weekStartStr = startOfWeek.toISOString().slice(0, 10);

      const weekLogs = logs.filter(
        l => !!l.date && l.date >= weekStartStr && l.date <= todayStr &&
             (l.status === 'completed' || l.status === 'partial')
      );
      const minRequired = Math.max(1, Math.ceil(activeDaysArr.length * 0.25));
      if (weekLogs.length >= minRequired) {
        evaluationDue = true;
      }
    }


    const totalCompleted = plan.completedPages ?? 0;
    const totalTarget = (plan.endPage ?? 1) - (plan.startPage ?? 1) + 1;
    const planFinished = totalCompleted >= totalTarget;
    const mapLog = (l: any):IDailyMurajaLog=> ({
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
    });

    const extraSessionsLogs = await db.query.dailyMurajaLogs.findMany({
      where: and(
        isNull(dailyMurajaLogs.planId),
        eq(dailyMurajaLogs.date, todayStr),
        eq(dailyMurajaLogs.status, 'extra')
      ),
      orderBy: [asc(dailyMurajaLogs.id)],
    });

    const activeDays: number[] = typeof plan.selectedDays === 'string'
     ? JSON.parse(plan.selectedDays || '[]')
      : plan.selectedDays ?? [];

    return {
      ...plan,
      muraja_last_page: stats?.murajaLastPage ?? 0,
      muraja_current_streak: stats?.murajaCurrentStreak ?? 0,
      daily_logs: logs.map(mapLog),
      todayLog: todayLog ? mapLog(todayLog) : null,
      today_extra_sessions: extraSessionsLogs.map(mapLog),
      evaluationDue,     
      planFinished,
      activeDays,
      preferred_time: plan.preferredTime ?? undefined,
      is_custom_time: plan.isCustomTime ?? undefined,
    };
  },

  async getPlanById(userId: string, planId: number) {
    const plan = await db.query.weeklyMurajaPlans.findFirst({
      where: and(eq(weeklyMurajaPlans.id, planId)),
    });

    if (!plan) return null;

    const logs = await db.query.dailyMurajaLogs.findMany({
      where: eq(dailyMurajaLogs.planId, planId),
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
        status: l.status as any,
        is_catchup: l.isCatchup,
        sync_status: l.syncStatus,
        start_page: l.startPage,
        mistakes_count: l.mistakesCount ?? 0,
        hesitation_count: l.hesitationCount ?? 0,
        quality_score: l.qualityScore,
      })),
    };
  },

  async syncUserAnalytics(tx: any, userId: string, planId: number, displayName?: string) {
    let rewards = null;
    const allLogs = await tx.query.dailyMurajaLogs.findMany({
      where: eq(dailyMurajaLogs.planId, planId),
      orderBy: [desc(dailyMurajaLogs.date)],
    });

    const plan = await tx.query.weeklyMurajaPlans.findFirst({
      where: eq(weeklyMurajaPlans.id, planId),
    });

    if (!plan) return;

    
    let calculatedStreak = 0;
    const todayStr = new Date().toISOString().slice(0, 10);
    for (const entry of allLogs) {
      if (!entry.date) continue;
      if (entry.status === "completed" || entry.status === "partial") {
        calculatedStreak++;
      } else if (entry.date < todayStr) {
        break; 
      }
    }

    const latestSuccessfulLog = allLogs.find((l: any) => (l.completedPages ?? 0) > 0);
    const trueLastPage = latestSuccessfulLog 
      ? (latestSuccessfulLog.startPage ?? 1) + (latestSuccessfulLog.completedPages ?? 0) - 1
      : (plan.startPage ?? 1) - 1;

    const totalCompletedPages = allLogs.reduce((sum: number, l: any) => sum + (l.completedPages ?? 0), 0);

    await tx.insert(userStats)
      .values({ 
        userId, 
        murajaLastPage: trueLastPage,
      })
      .onConflictDoUpdate({
        target: userStats.userId,
        set: { 
          murajaLastPage: trueLastPage
        }
      });

    if (plan.isActive) {
        const remainingPages = (plan.endPage ?? 0) - trueLastPage;
        if (remainingPages > 0) {
            const parsedDays = typeof plan.selectedDays === "string"
              ? JSON.parse(plan.selectedDays)
              : (plan.selectedDays ?? []);
            const weeklyFreq = parsedDays.length || 7;
            const dailyRate = Math.max(1, plan.plannedPagesPerDay);
            const { finishDate: newEndDateStr } = calculateMurajaFinishedDate(remainingPages, dailyRate, weeklyFreq);

            if (newEndDateStr !== plan.weekEndDate) {
                await tx.update(weeklyMurajaPlans)
                    .set({ weekEndDate: newEndDateStr, syncStatus: 0 })
                    .where(eq(weeklyMurajaPlans.id, planId));
            }
        }
    }

   
    const todayLog = allLogs.find((l: any) => l.date === todayStr);
    const status = todayLog ? todayLog.status : "pending";
    
    if (calculatedStreak > 0) {
      const recentQuality = latestSuccessfulLog?.qualityScore ?? 3;
      rewards = await GamificationService.processSessionCompletion(tx, userId, recentQuality, calculatedStreak);

      // Evaluate and award plan progress milestones
      const progressBadges = await GamificationService.checkPlanProgressBadges(tx, userId, "muraja", planId);
      if (progressBadges && progressBadges.length > 0) {
        if (!rewards.badges) rewards.badges = [];
        rewards.badges.push(...progressBadges);
      }
    }

    await notificationService.processHabitEvent({
      userId,
      habitType: "muraja",
      status: status as any,
      date: todayStr,
      displayName: displayName || "Hafiz",
      rewards
    });

    return { rewards };
  },

  async upsertLog(userId: string, log: IDailyMurajaLog, displayName?: string): Promise<LocalMurajaLogWriteResult> {
    let localLogId: number | null = null;
    let changed = false;
    let created = false;
    let previousStatus: IDailyMurajaLog["status"] | null = null;
    let currentStatus: IDailyMurajaLog["status"] | "pending" | null = null;
    let rewards = null;

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
          
          await PageMasteryService.syncPageActivityLogs(tx, userId, 'muraja', existing.id, log.date ?? '', null, 'low');
          await PerformanceService.recomputeAllPerformance(tx, userId);
          
          await notificationService.removeHabitEvent(userId, 'muraja', log.date ?? '');

          if (log.plan_id) {
            const wasCompleted = existing.status === 'completed';
            const wasMissed = existing.status === 'missed';
            await tx.update(weeklyMurajaPlans)
              .set({
                completedPages: sql`MAX(0, completed_pages - ${existing.completedPages ?? 0})`,
                perfectDaysCount: wasCompleted ? sql`MAX(0, perfect_days_count - 1)` : sql`perfect_days_count`,
                missedDaysCount: wasMissed ? sql`MAX(0, missed_days_count - 1)` : sql`missed_days_count`,
                syncStatus: 0,
              })
              .where(eq(weeklyMurajaPlans.id, log.plan_id));
          }

          changed = true;
        }
        await this.syncUserAnalytics(tx, userId, log.plan_id, displayName);
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

      if (log.plan_id) {
        const pagesNow = log.completed_pages ?? 0;
        const pagesBefore = existing?.completedPages ?? 0;
        const pageDelta = pagesNow - pagesBefore;
        const statusNow = log.status;
        const statusBefore = existing?.status ?? null;
        const perfectDelta = (statusNow === 'completed' ? 1 : 0) - (statusBefore === 'completed' ? 1 : 0);
        const missedDelta = (statusNow === 'missed' ? 1 : 0) - (statusBefore === 'missed' ? 1 : 0);

        await tx.update(weeklyMurajaPlans)
          .set({
            completedPages: sql`MAX(0, completed_pages + ${pageDelta})`,
            perfectDaysCount: sql`MAX(0, perfect_days_count + ${perfectDelta})`,
            missedDaysCount: sql`MAX(0, missed_days_count + ${missedDelta})`,
            syncStatus: 0,
          })
          .where(eq(weeklyMurajaPlans.id, log.plan_id));
      }

      currentStatus = log.status as any;
      const isMissed = log.status === "missed";

      await upsertHabitProgressLog(tx as any, {
        userId,
        date: log.date,
        activityType: "MURAJA",
        minutesSpent: isMissed ? 0 : (log.actual_time_min ?? 0),
        unitsCompleted: isMissed ? 0 : Math.max(0, Math.round(log.completed_pages ?? 0)),
        note: null,
        planId: log.plan_id,
        localRefId: localLogId,
        eventType: isMissed ? "TASK_MISSED" : "MURAJA_COMPLETED",
        metadata: JSON.stringify({
          startPage: log.start_page,
          endPage: (log.start_page ?? 0) + (log.completed_pages ?? 0) - 1,
          qualityScore: log.quality_score
        })
      });

      const qualityScore = log.quality_score ?? PerformanceService.deriveQualityScore(log.mistakes_count ?? 0, log.hesitation_count ?? 0);
      const quality: 'perfect' | 'medium' | 'low' = qualityScore >= 5 ? 'perfect' : qualityScore <= 2 ? 'low' : 'medium';
      
      await PageMasteryService.syncPageActivityLogs(
        tx,
        userId,
        'muraja',
        localLogId!,
        log.date!,
        isMissed ? null : Array.from(
          { length: Math.max(0, (log.completed_pages ?? 0)) },
          (_, i) => (log.start_page ?? 1) + i
        ),
        quality,
        log.mistakes_count ?? 0,
        log.hesitation_count ?? 0
      );

      await PerformanceService.recomputeAllPerformance(tx, userId);
      const analytics = await this.syncUserAnalytics(tx, userId, log.plan_id, displayName);
      rewards = analytics?.rewards;
    });

    if (changed) {
      void this.syncPending(userId);
    }

    return { localLogId, changed, created, previousStatus, currentStatus, rewards };
  },

  async logExtraSession(
    userId: string,
    date: string,
    startPage: number,
    endPage: number,
    completedPages: number,
    actualTimeMin: number,
    mistakesCount: number = 0,
    hesitationCount: number = 0,
    qualityScore?: number | null
  ) {
    let localLogId: number | null = null;
    
    await db.transaction(async (tx) => {
      const [newLog] = await tx.insert(dailyMurajaLogs).values({
        date,
        planId: null, 
        startPage,
        completedPages,
        syncStatus: 0,
        isCatchup: false,
        actualTimeMin,
        status: 'extra',
        mistakesCount,
        hesitationCount,
        qualityScore: qualityScore ?? null,
        remoteId: null,
      }).returning({ id: dailyMurajaLogs.id });
      
      localLogId = newLog.id;

      await upsertHabitProgressLog(tx as any, {
        userId,
        date,
        activityType: "MURAJA",
        minutesSpent: actualTimeMin,
        unitsCompleted: Math.max(0, Math.round(completedPages)),
        note: null,
        planId: null,
        localRefId: localLogId,
        eventType: "EXTRA_SESSION",
        metadata: JSON.stringify({
          startPage,
          endPage,
          qualityScore
        })
      });

      const finalQualityScore = qualityScore ?? PerformanceService.deriveQualityScore(mistakesCount, hesitationCount);
      const quality: 'perfect' | 'medium' | 'low' = finalQualityScore >= 5 ? 'perfect' : finalQualityScore <= 2 ? 'low' : 'medium';
      
      await PageMasteryService.syncPageActivityLogs(
        tx,
        userId,
        'muraja',
        localLogId,
        date,
        Array.from({ length: completedPages }, (_, i) => startPage + i),
        quality,
        mistakesCount,
        hesitationCount
      );

      await PerformanceService.recomputeAllPerformance(tx, userId);
    });
    
    void this.syncPending(userId);
    return localLogId;
  },

  async syncPending(userId: string) {
    const { sync } = await import("@/src/services/sync");
    await sync.push("muraja_plans");
    await sync.push("muraja_logs");
    await sync.push("user_stats");
    await sync.push("page_performance");
    await sync.push("page_activity_logs");
    await sync.push("habit_events");
    await sync.push("notifications");
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
  },

  async getMonthlyHistory(year: number, month: number, userId: string) {
    const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
    const endOfMonth = `${year}-${String(month).padStart(2, '0')}-31`;

    return await db.query.dailyMurajaLogs.findMany({
      where: and(
        gte(dailyMurajaLogs.date, startOfMonth),
        lte(dailyMurajaLogs.date, endOfMonth),
        sql`${dailyMurajaLogs.planId} IN (SELECT id FROM weekly_muraja_plan WHERE user_id = ${userId})`
      ),
      orderBy: [dailyMurajaLogs.date],
    });
  },

  async recyclePlan(userId: string, planId: number) {
    const oldPlan = await db.query.weeklyMurajaPlans.findFirst({
      where: eq(weeklyMurajaPlans.id, planId),
    });

    if (!oldPlan) return;

    const today = new Date().toISOString().split('T')[0];
    
    const totalPages = Math.max(1, (oldPlan.endPage ?? 0) - (oldPlan.startPage ?? 1) + 1);
    const parsedDays = typeof oldPlan.selectedDays === "string"
      ? JSON.parse(oldPlan.selectedDays)
      : (oldPlan.selectedDays ?? []);
    const weeklyFreq = parsedDays.length || 7;
    const dailyRate = oldPlan.plannedPagesPerDay ?? 2;
    const { finishDate: endDateStr } = calculateMurajaFinishedDate(totalPages, dailyRate, weeklyFreq);

    return await this.createPlan({
      user_id: userId,
      week_start_date: today,
      week_end_date: endDateStr,
      planned_pages_per_day: oldPlan.plannedPagesPerDay ?? 2,
      start_page: oldPlan.startPage ?? 1,
      end_page: oldPlan.endPage ?? 10,
      selected_days: oldPlan.selectedDays ?? "[0,1,2,3,4,5,6]",
      estimated_time_min: oldPlan.estimatedTimeMin ?? 15,
      preferred_time: oldPlan.preferredTime ?? null,
      is_custom_time: oldPlan.isCustomTime ?? false,
      evaluationDay: oldPlan.evaluationDay ?? 5,
    } as any);
  },

  async completePlan(userId: string, planId: number) {
    await db.transaction(async (tx) => {
      await tx.update(weeklyMurajaPlans)
        .set({ isActive: false, syncStatus: 0 })
        .where(and(eq(weeklyMurajaPlans.userId, userId), eq(weeklyMurajaPlans.id, planId)));
      
      await tx.update(activityPlans)
        .set({ status: 'completed', updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(
          eq(activityPlans.userId, userId),
          eq(activityPlans.activityType, 'MURAJA'),
          eq(activityPlans.localRefId, planId)
        ));
    });
    
    void this.syncPending(userId);
  }
};
