import { db } from "@/src/lib/db/local-client";
import { 
  habitEvents, 
  notifications, 
  notificationQueue, 
  scheduledNotifications 
} from "../database/notificationSchema";
import { eq, and, sql, desc, lte, ne } from "drizzle-orm";


export const notificationRepository = {
  
 
  
  async getNotifications(userId: string) {
    return await db.query.notifications.findMany({
      where: eq(notifications.userId, userId),
      orderBy: [desc(notifications.createdAt)],
    });
  },

  async getUnreadCount(userId: string) {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)));
    return result[0]?.count ?? 0;
  },

  async markAsRead(userId: string, notificationId: number) {
    await db.update(notifications)
      .set({ isRead: 1, updatedAt: sql`CURRENT_TIMESTAMP`, syncStatus: 0 })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
  },

  async markAllAsRead(userId: string) {
    await db.update(notifications)
      .set({ isRead: 1, updatedAt: sql`CURRENT_TIMESTAMP`, syncStatus: 0 })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)));
  },

  async createNotification(userId: string, payload: {
    type: 'xp' | 'warning' | 'milestone',
    title: string,
    message: string,
    eventKey: string
  }) {
    const timestamp = new Date().toISOString();
    
    const inserted = await db.insert(notifications)
      .values({
        userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        eventKey: payload.eventKey,
        lastNotifiedAt: timestamp,
        updatedAt: timestamp,
      })
      .onConflictDoNothing();

    if (inserted.changes > 0) {
      const row = await db.query.notifications.findFirst({
        where: and(eq(notifications.userId, userId), eq(notifications.eventKey, payload.eventKey)),
        columns: { id: true }
      });
      
      if (row) {
        await db.insert(notificationQueue)
          .values({ userId, notificationId: row.id })
          .onConflictDoNothing();
          
        return { id: row.id, title: payload.title, body: payload.message };
      }
    }
    return null;
  },


  async getHabitEvents(userId: string) {
    return await db.query.habitEvents.findMany({
      where: eq(habitEvents.userId, userId),
      orderBy: [desc(habitEvents.date)],
    });
  },

  async upsertHabitEvent(userId: string, payload: {
    habitType: 'hifz' | 'muraja',
    status: 'completed' | 'partial' | 'missed',
    date: string,
    xpGained: number
  }) {
    await db.insert(habitEvents)
      .values({
        userId,
        habitType: payload.habitType,
        status: payload.status,
        date: payload.date,
        xpGained: payload.xpGained,
      })
      .onConflictDoUpdate({
        target: [habitEvents.userId, habitEvents.habitType, habitEvents.date],
        set: {
          status: payload.status,
          xpGained: payload.xpGained,
          syncStatus: 0,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        }
      });
  },


  async getScheduledNotification(userId: string, eventKey: string) {
    return await db.query.scheduledNotifications.findFirst({
      where: and(eq(scheduledNotifications.userId, userId), eq(scheduledNotifications.eventKey, eventKey)),
    });
  },

  async upsertScheduledNotification(userId: string, payload: {
    kind: string,
    habitType?: 'hifz' | 'muraja',
    eventKey: string,
    scheduledFor: string,
    notificationIdentifier: string
  }) {
    await db.insert(scheduledNotifications)
      .values({
        userId,
        kind: payload.kind,
        habitType: payload.habitType,
        eventKey: payload.eventKey,
        scheduledFor: payload.scheduledFor,
        notificationIdentifier: payload.notificationIdentifier,
      })
      .onConflictDoUpdate({
        target: [scheduledNotifications.userId, scheduledNotifications.eventKey],
        set: {
          habitType: payload.habitType,
          scheduledFor: payload.scheduledFor,
          notificationIdentifier: payload.notificationIdentifier,
          status: 'scheduled',
          updatedAt: sql`CURRENT_TIMESTAMP`,
        }
      });
  },

  async deleteScheduledNotification(userId: string, eventKey: string) {
    await db.delete(scheduledNotifications)
      .where(and(eq(scheduledNotifications.userId, userId), eq(scheduledNotifications.eventKey, eventKey)));
  },

  async getExpiredSchedules(userId: string, todayKey: string) {
    return await db.query.scheduledNotifications.findMany({
      where: and(eq(scheduledNotifications.userId, userId), lte(scheduledNotifications.scheduledFor, todayKey)),
    });
  },

  async recordDeliveredNotification(payload: {
    userId: string;
    type: 'xp' | 'warning' | 'milestone';
    title: string;
    message: string;
    eventKey: string;
  }) {
    await this.createNotification(payload.userId, payload);
  }
};
