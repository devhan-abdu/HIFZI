import { db as drizzleDb } from "@/src/lib/db/local-client";
import { activityLogs, activityPlans, weeklySummarySeen, adaptiveGuidanceCache } from "../database/habitSchema";
import { eq, and, sql } from "drizzle-orm";
import { 
  ActivityType, 
  HabitType, 
  ActivityEventType, 
  HabitLogMetadata 
} from "./habitTypes";

export const habitProgressService = {
  async insertHabitProgressLog(
    db: any,
    payload: {
      userId: string;
      date: string;
      habitType?: HabitType;
      activityType?: HabitType;
      minutesSpent: number;
      unitsCompleted: number;
      note?: string | null;
      planId?: number | null;
      metadata?: string | null;
      localRefId?: number | null;
      eventType?: ActivityEventType;
      reference?: string | null;
      recordedAt?: string;
    }
  ) {
    const type = this.normalizeActivityType(payload.activityType ?? payload.habitType ?? "NORMAL_READING");
    
    const mergedMetadata = {
      ...this.safeParseMetadata(payload.metadata ?? null),
      eventType: payload.eventType ?? this.defaultEventType(type),
      status: payload.eventType === "TASK_UNDONE" ? "undone" : payload.eventType === "TASK_MISSED" ? "missed" : "completed",
      reference: payload.reference ?? null,
      sourceDate: payload.date,
      sourceKey: `${type}:${payload.planId ?? "na"}:${payload.date}`,
      recordedAt: payload.recordedAt ?? new Date().toISOString(),
    } satisfies HabitLogMetadata;

    const tx = db || drizzleDb;
    const [result] = await tx.insert(activityLogs).values({
      userId: payload.userId,
      date: payload.date,
      activityType: type,
      planId: payload.planId ?? null,
      localRefId: payload.localRefId ?? null,
      minutesSpent: Math.max(0, Math.round(payload.minutesSpent)),
      unitsCompleted: Math.max(0, Math.round(payload.unitsCompleted)),
      note: payload.note ?? null,
      metadata: JSON.stringify(mergedMetadata),
      isSynced: 0,
    }).returning({ id: activityLogs.id });

    return result.id;
  },

  async deleteHabitProgressLog(
    db: any,
    payload: {
      userId: string;
      activityType: HabitType;
      localRefId: number;
    }
  ) {
    const type = this.normalizeActivityType(payload.activityType);
    const tx = db || drizzleDb;
    await tx.delete(activityLogs).where(and(
      eq(activityLogs.userId, payload.userId),
      eq(activityLogs.activityType, type),
      eq(activityLogs.localRefId, payload.localRefId)
    ));
  },

  async upsertActivityPlan(
    db: any,
    payload: {
      userId: string;
      activityType: ActivityType;
      status?: "active" | "paused" | "completed";
      title?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      metadata?: string | null;
      localRefId?: number | null;
    }
  ) {
    const tx = db || drizzleDb;
    
    await tx.update(activityPlans)
      .set({ status: 'paused', updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(
        eq(activityPlans.userId, payload.userId),
        eq(activityPlans.activityType, payload.activityType),
        eq(activityPlans.status, 'active')
      ));

    const [result] = await tx.insert(activityPlans).values({
      userId: payload.userId,
      activityType: payload.activityType,
      localRefId: payload.localRefId ?? null,
      title: payload.title ?? null,
      startDate: payload.startDate ?? null,
      endDate: payload.endDate ?? null,
      status: payload.status ?? "active",
      metadata: payload.metadata ?? null,
      isSynced: 0,
    }).returning({ id: activityPlans.id });

    return result.id;
  },

  async shouldShowWeeklySummary(db: any, userId: string) {
    const now = new Date();
    const day = now.getDay();
    if (day !== 0 && day !== 1) return false;

    const weekKey = this.getWeekKey(now);
    const tx = db || drizzleDb;
    
    const seen = await tx.query.weeklySummarySeen.findFirst({
      where: and(
        eq(weeklySummarySeen.userId, userId),
        eq(weeklySummarySeen.weekKey, weekKey)
      )
    });

    return !seen;
  },

  async markWeeklySummarySeen(db: any, userId: string) {
    const weekKey = this.getWeekKey(new Date());
    const tx = db?.insert ? db : drizzleDb;
    await tx.insert(weeklySummarySeen).values({ userId, weekKey });
  },

  async getCachedGuidance(db: any, userId: string) {
    const tx = db?.select ? db : drizzleDb;
    const result = await tx.select().from(adaptiveGuidanceCache).where(eq(adaptiveGuidanceCache.userId, userId));
    return result[0];
  },

  async upsertCachedGuidance(db: any, params: { userId: string, activityHash: string, data: any }) {
    const tx = db?.insert ? db : drizzleDb;
    const payloadStr = JSON.stringify(params.data);
    await tx.insert(adaptiveGuidanceCache)
      .values({
        userId: params.userId,
        activityHash: params.activityHash,
        payload: payloadStr
      })
      .onConflictDoUpdate({
        target: adaptiveGuidanceCache.userId,
        set: {
          activityHash: params.activityHash,
          payload: payloadStr,
          updatedAt: sql`CURRENT_TIMESTAMP`
        }
      });
  },

  getWeekKey(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo}`;
  },

  normalizeActivityType(type: HabitType): ActivityType {
    if (type === "HIFZ" || type === "MURAJA" || type === "NORMAL_READING") return type;
    if (type === "hifz") return "HIFZ";
    if (type === "review") return "MURAJA";
    return "NORMAL_READING";
  },

  defaultEventType(activityType: ActivityType): ActivityEventType {
    if (activityType === "HIFZ") return "HIFZ_COMPLETED";
    if (activityType === "MURAJA") return "MURAJA_COMPLETED";
    return "NORMAL_READING_COMPLETED";
  },

  safeParseMetadata(metadata: string | null): HabitLogMetadata {
    try { return metadata ? JSON.parse(metadata) : {}; } catch { return {}; }
  }
};

export const insertHabitProgressLog = habitProgressService.insertHabitProgressLog.bind(habitProgressService);
export const deleteHabitProgressLog = habitProgressService.deleteHabitProgressLog.bind(habitProgressService);
export const upsertActivityPlan = habitProgressService.upsertActivityPlan.bind(habitProgressService);
export const shouldShowWeeklySummary = habitProgressService.shouldShowWeeklySummary.bind(habitProgressService);
export const markWeeklySummarySeen = habitProgressService.markWeeklySummarySeen.bind(habitProgressService);
export const getCachedGuidance = habitProgressService.getCachedGuidance.bind(habitProgressService);
export const upsertCachedGuidance = habitProgressService.upsertCachedGuidance.bind(habitProgressService);
