import * as Notifications from "expo-notifications";
import { SQLiteDatabase } from "expo-sqlite";
import { supabase } from "@/src/lib/supabase";
import { Platform } from "react-native";

type HabitType = "hifz" | "muraja";
type HabitStatus = "completed" | "missed" | "partial";
export type NotificationType = "xp" | "warning" | "milestone";
type LocalNotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

type UserStatsRow = {
  user_id: string;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  last_notified_at: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const NOTIFICATION_SCHEMA_VERSION = 3;
const STREAK_RISK_HOUR = 18;
const NOTIFICATION_CHANNEL_ID = "default";
const TRACKED_HABITS: HabitType[] = ["hifz", "muraja"];
let notificationsConfigured = false;

function toDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function xpByStatus(status: HabitStatus) {
  if (status === "completed") return 50;
  if (status === "partial") return 20;
  return 0;
}

function computeStreaks(activeDates: string[], todayKey: string) {
  const uniqueSorted = Array.from(new Set(activeDates)).sort();
  const set = new Set(uniqueSorted);
  let current = 0;
  const cursor = fromDateKey(todayKey);
  while (set.has(toDateKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  let longest = 0;
  let running = 0;
  let previous: Date | null = null;
  for (const dateKey of uniqueSorted) {
    const currentDate = fromDateKey(dateKey);
    if (!previous) {
      running = 1;
    } else {
      const diff = Math.round((currentDate.getTime() - previous.getTime()) / DAY_MS);
      running = diff === 1 ? running + 1 : 1;
    }
    longest = Math.max(longest, running);
    previous = currentDate;
  }
  return { current, longest };
}

function getHabitLabel(habitType: HabitType) {
  return habitType === "hifz" ? "Hifz" : "Muraja";
}

function getYesterdayKey(now = new Date()) {
  return toDateKey(new Date(now.getTime() - DAY_MS));
}

function getStreakRiskTriggerDate(now = new Date()) {
  const triggerDate = new Date(now);
  triggerDate.setHours(STREAK_RISK_HOUR, 0, 0, 0);
  return triggerDate;
}

function buildStreakRiskScheduleKey(habitType: HabitType, dateKey: string) {
  return `schedule:risk:${habitType}:${dateKey}`;
}

function buildStreakRiskEventKey(habitType: HabitType, dateKey: string) {
  return `risk:${getHabitLabel(habitType)}:${dateKey}`;
}

async function ensureNotificationRuntimeConfigured() {
  if (!notificationsConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationsConfigured = true;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: "default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#276359",
    });
  }
}

async function ensureNotificationPermissionsGranted() {
  await ensureNotificationRuntimeConfigured();

  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.status === "granted") {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

async function ensureColumn(
  db: SQLiteDatabase,
  table: string,
  column: string,
  definition: string,
) {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!columns.some((item) => item.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export async function initNotificationTables(db: SQLiteDatabase) {
  const versionRow = await db.getFirstAsync<{ user_version: number }>(`PRAGMA user_version`);
  const currentVersion = Number(versionRow?.user_version ?? 0);

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS habit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      habit_type TEXT NOT NULL CHECK(habit_type IN ('hifz', 'muraja')),
      status TEXT NOT NULL CHECK(status IN ('completed', 'partial', 'missed')),
      date TEXT NOT NULL,
      xp_gained INTEGER NOT NULL DEFAULT 0,
      remote_id TEXT,
      sync_status INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, habit_type, date)
    );

    CREATE INDEX IF NOT EXISTS idx_habit_events_user_date
      ON habit_events(user_id, date);

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      event_key TEXT NOT NULL,
      last_notified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      sync_status INTEGER NOT NULL DEFAULT 0,
      remote_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, event_key)
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user_created
      ON notifications(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS notification_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      notification_id INTEGER NOT NULL,
      sync_status INTEGER NOT NULL DEFAULT 0,
      remote_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, notification_id)
    );

    CREATE TABLE IF NOT EXISTS scheduled_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      habit_type TEXT,
      event_key TEXT NOT NULL,
      scheduled_for TEXT NOT NULL,
      notification_identifier TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, event_key)
    );

    CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_user_kind
      ON scheduled_notifications(user_id, kind, scheduled_for);
  `);

  await db.execAsync(`CREATE TABLE IF NOT EXISTS user_stats (user_id TEXT PRIMARY KEY);`);
  await ensureColumn(db, "notification_queue", "notification_id", "INTEGER");
  await ensureColumn(db, "notification_queue", "sync_status", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "notification_queue", "remote_id", "TEXT");
  await ensureColumn(db, "notification_queue", "created_at", "TEXT");
  await db.execAsync(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_queue_user_notification
      ON notification_queue(user_id, notification_id);
  `);
  await ensureColumn(db, "user_stats", "total_xp", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "user_stats", "level", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "user_stats", "current_streak", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "user_stats", "longest_streak", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "user_stats", "last_activity_date", "TEXT");
  await ensureColumn(db, "user_stats", "last_active_date", "TEXT");
  await ensureColumn(db, "user_stats", "last_notified_at", "TEXT");
  await ensureColumn(db, "scheduled_notifications", "habit_type", "TEXT");
  await ensureColumn(db, "scheduled_notifications", "notification_identifier", "TEXT");
  await ensureColumn(db, "scheduled_notifications", "status", "TEXT NOT NULL DEFAULT 'scheduled'");
  if (currentVersion < NOTIFICATION_SCHEMA_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${NOTIFICATION_SCHEMA_VERSION}`);
  }
}

export async function sendLocalNotification({
  title,
  body,
  data,
}: {
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  const granted = await ensureNotificationPermissionsGranted();
  if (!granted) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      ...(Platform.OS === "android" ? { channelId: NOTIFICATION_CHANNEL_ID } : {}),
    },
    trigger: null,
  });
}

async function createNotificationRecord(
  db: SQLiteDatabase,
  payload: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    eventKey: string;
  },
) {
  const timestamp = new Date().toISOString();
  const inserted = await db.runAsync(
    `
      INSERT OR IGNORE INTO notifications (
        user_id, type, title, message, is_read, event_key, last_notified_at, sync_status, updated_at
      ) VALUES (?, ?, ?, ?, 0, ?, ?, 0, ?)
    `,
    [
      payload.userId,
      payload.type,
      payload.title,
      payload.message,
      payload.eventKey,
      timestamp,
      timestamp,
    ],
  );
  if ((inserted.changes ?? 0) === 0) return null;
  const row = await db.getFirstAsync<{ id: number }>(
    `
      SELECT id FROM notifications
      WHERE user_id = ? AND event_key = ?
      LIMIT 1
    `,
    [payload.userId, payload.eventKey],
  );
  if (!row?.id) return null;
  await db.runAsync(
    `
      INSERT OR IGNORE INTO notification_queue (user_id, notification_id, sync_status)
      VALUES (?, ?, 0)
    `,
    [payload.userId, row.id],
  );
  return {
    id: row.id,
    notification: {
      title: payload.title,
      body: payload.message,
    } satisfies LocalNotificationPayload,
  };
}

async function enqueueAndNotify(
  db: SQLiteDatabase,
  payload: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    eventKey: string;
  },
) {
  return createNotificationRecord(db, payload);
}

export async function insertNotificationDirect(
  db: SQLiteDatabase,
  payload: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    eventKey: string;
  },
) {
  await createNotificationRecord(db, payload);
}

type ScheduledNotificationRow = {
  id: number;
  event_key: string;
  notification_identifier: string | null;
  scheduled_for: string;
};

async function getScheduledNotificationRow(
  db: SQLiteDatabase,
  userId: string,
  eventKey: string,
) {
  return db.getFirstAsync<ScheduledNotificationRow>(
    `
      SELECT id, event_key, notification_identifier, scheduled_for
      FROM scheduled_notifications
      WHERE user_id = ? AND event_key = ?
      LIMIT 1
    `,
    [userId, eventKey],
  );
}

async function upsertScheduledNotificationRow(
  db: SQLiteDatabase,
  payload: {
    userId: string;
    kind: "streak_risk";
    habitType: HabitType;
    eventKey: string;
    scheduledFor: string;
    notificationIdentifier: string;
  },
) {
  await db.runAsync(
    `
      INSERT INTO scheduled_notifications (
        user_id,
        kind,
        habit_type,
        event_key,
        scheduled_for,
        notification_identifier,
        status,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, event_key) DO UPDATE SET
        habit_type = excluded.habit_type,
        scheduled_for = excluded.scheduled_for,
        notification_identifier = excluded.notification_identifier,
        status = 'scheduled',
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      payload.userId,
      payload.kind,
      payload.habitType,
      payload.eventKey,
      payload.scheduledFor,
      payload.notificationIdentifier,
    ],
  );
}

async function cancelScheduledNotificationByKey(
  db: SQLiteDatabase,
  payload: { userId: string; eventKey: string },
) {
  const scheduled = await getScheduledNotificationRow(db, payload.userId, payload.eventKey);

  if (scheduled?.notification_identifier) {
    try {
      await Notifications.cancelScheduledNotificationAsync(
        scheduled.notification_identifier,
      );
    } catch {
      // Ignore cancellation errors for already-fired notifications.
    }
  }

  await db.runAsync(
    `DELETE FROM scheduled_notifications WHERE user_id = ? AND event_key = ?`,
    [payload.userId, payload.eventKey],
  );
}

async function cleanupExpiredScheduledNotifications(
  db: SQLiteDatabase,
  userId: string,
  now = new Date(),
) {
  const rows = await db.getAllAsync<ScheduledNotificationRow>(
    `
      SELECT id, event_key, notification_identifier, scheduled_for
      FROM scheduled_notifications
      WHERE user_id = ?
    `,
    [userId],
  );

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayTime = startOfToday.getTime();
  for (const row of rows) {
    const scheduledTime = new Date(row.scheduled_for).getTime();
    if (!Number.isFinite(scheduledTime) || scheduledTime >= startOfTodayTime) {
      continue;
    }

    await cancelScheduledNotificationByKey(db, {
      userId,
      eventKey: row.event_key,
    });
  }
}

async function hasPositiveHabitEventOnDate(
  db: SQLiteDatabase,
  payload: {
    userId: string;
    habitType: HabitType;
    dateKey: string;
  },
) {
  const row = await db.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) as count
      FROM habit_events
      WHERE user_id = ?
        AND habit_type = ?
        AND date = ?
        AND status IN ('completed', 'partial')
    `,
    [payload.userId, payload.habitType, payload.dateKey],
  );

  return (row?.count ?? 0) > 0;
}

async function getLastPositiveHabitDate(
  db: SQLiteDatabase,
  payload: {
    userId: string;
    habitType: HabitType;
    beforeDateKey: string;
  },
) {
  const row = await db.getFirstAsync<{ date: string | null }>(
    `
      SELECT MAX(date) as date
      FROM habit_events
      WHERE user_id = ?
        AND habit_type = ?
        AND date < ?
        AND status IN ('completed', 'partial')
    `,
    [payload.userId, payload.habitType, payload.beforeDateKey],
  );

  return row?.date ?? null;
}

async function scheduleStreakRiskForHabit(
  db: SQLiteDatabase,
  payload: { userId: string; habitType: HabitType; now?: Date },
) {
  const now = payload.now ?? new Date();
  const todayKey = toDateKey(now);
  const scheduleKey = buildStreakRiskScheduleKey(payload.habitType, todayKey);
  const riskEventKey = buildStreakRiskEventKey(payload.habitType, todayKey);
  const hasTodayActivity = await hasPositiveHabitEventOnDate(db, {
    userId: payload.userId,
    habitType: payload.habitType,
    dateKey: todayKey,
  });

  if (hasTodayActivity) {
    await cancelScheduledNotificationByKey(db, {
      userId: payload.userId,
      eventKey: scheduleKey,
    });
    return;
  }

  const lastPositiveDate = await getLastPositiveHabitDate(db, {
    userId: payload.userId,
    habitType: payload.habitType,
    beforeDateKey: todayKey,
  });

  if (lastPositiveDate !== getYesterdayKey(now)) {
    await cancelScheduledNotificationByKey(db, {
      userId: payload.userId,
      eventKey: scheduleKey,
    });
    return;
  }

  const habitLabel = getHabitLabel(payload.habitType);
  const triggerDate = getStreakRiskTriggerDate(now);
  const existing = await getScheduledNotificationRow(db, payload.userId, scheduleKey);

  if (now.getTime() >= triggerDate.getTime()) {
    await cancelScheduledNotificationByKey(db, {
      userId: payload.userId,
      eventKey: scheduleKey,
    });

    const risk = await triggerStreakRisk(db, {
      userId: payload.userId,
      habit: habitLabel,
    });

    if (risk?.notification) {
      if (!existing?.notification_identifier) {
        await sendLocalNotification({
          ...risk.notification,
          data: {
            userId: payload.userId,
            type: "warning",
            title: risk.notification.title,
            message: risk.notification.body,
            eventKey: riskEventKey,
            habitType: payload.habitType,
          },
        });
      }
    }
    return;
  }

  if (existing?.notification_identifier) {
    return;
  }

  const granted = await ensureNotificationPermissionsGranted();
  if (!granted) {
    return;
  }

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Streak Risk",
      body: `⚠️ Your streak is in danger! Complete ${habitLabel} before midnight!`,
      data: {
        userId: payload.userId,
        type: "warning",
        title: "Streak Risk",
        message: `⚠️ Your streak is in danger! Complete ${habitLabel} before midnight!`,
        eventKey: riskEventKey,
        habitType: payload.habitType,
      },
      ...(Platform.OS === "android" ? { channelId: NOTIFICATION_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  await upsertScheduledNotificationRow(db, {
    userId: payload.userId,
    kind: "streak_risk",
    habitType: payload.habitType,
    eventKey: scheduleKey,
    scheduledFor: triggerDate.toISOString(),
    notificationIdentifier: identifier,
  });
}

export async function markNotificationAsRead(
  db: SQLiteDatabase,
  userId: string,
  notificationId: number,
) {
  await db.runAsync(
    `
      UPDATE notifications
      SET is_read = 1, updated_at = CURRENT_TIMESTAMP, sync_status = 0
      WHERE id = ? AND user_id = ?
    `,
    [notificationId, userId],
  );
}

export async function markAllNotificationsAsRead(db: SQLiteDatabase, userId: string) {
  await db.runAsync(
    `
      UPDATE notifications
      SET is_read = 1, updated_at = CURRENT_TIMESTAMP, sync_status = 0
      WHERE user_id = ? AND is_read = 0
    `,
    [userId],
  );
}

export async function getNotifications(db: SQLiteDatabase, userId: string) {
  return db.getAllAsync<{
    id: number;
    user_id: string;
    title: string;
    message: string;
    type: NotificationType;
    is_read: number;
    created_at: string;
  }>(
    `
      SELECT id, user_id, title, message, type, is_read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
    `,
    [userId],
  );
}

export async function getUnreadNotificationCount(db: SQLiteDatabase, userId: string) {
  const row = await db.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ? AND is_read = 0
    `,
    [userId],
  );
  return row?.count ?? 0;
}

async function syncPendingNotifications(db: SQLiteDatabase, userId: string) {
  const pending = await db.getAllAsync<{
    id: number;
    type: string;
    title: string;
    message: string;
    event_key: string;
    last_notified_at: string;
    is_read: number;
  }>(
    `
      SELECT id, type, title, message, event_key, last_notified_at, is_read
      FROM notifications
      WHERE user_id = ? AND sync_status = 0
      ORDER BY id ASC
      LIMIT 100
    `,
    [userId],
  );

  for (const item of pending) {
    const response = await supabase
      .from("notifications")
      .upsert(
        {
          user_id: userId,
          type: item.type,
          title: item.title,
          message: item.message,
          event_key: item.event_key,
          is_read: item.is_read === 1,
          created_at: item.last_notified_at,
          local_id: item.id,
        },
        { onConflict: "user_id,event_key" },
      )
      .select("id")
      .single();

    if (response.error) break;
    await db.runAsync(
      `UPDATE notifications SET sync_status = 1, remote_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [response.data?.id ? String(response.data.id) : null, item.id],
    );
  }
}

export async function triggerStreakMilestone(
  db: SQLiteDatabase,
  payload: { userId: string; displayName: string; streak: number },
) {
  return enqueueAndNotify(db, {
    userId: payload.userId,
    type: "milestone",
    eventKey: `milestone:${payload.streak}:${toDateKey()}`,
    title: "Streak Milestone",
    message: `🔥 ${payload.displayName}! You're on a ${payload.streak}-day streak! Don't let it break!`,
  });
}

export async function triggerStreakRisk(
  db: SQLiteDatabase,
  payload: { userId: string; habit: "Hifz" | "Muraja" },
) {
  return enqueueAndNotify(db, {
    userId: payload.userId,
    type: "warning",
    eventKey: `risk:${payload.habit}:${toDateKey()}`,
    title: "Streak Risk",
    message: `⚠️ Your streak is in danger! Complete ${payload.habit} before midnight!`,
  });
}

export async function triggerXPReward(
  db: SQLiteDatabase,
  payload: {
    userId: string;
    habitType: HabitType;
    status: HabitStatus;
    date: string;
    xpGained: number;
    xpToNextLevel: number;
  },
) {
  return enqueueAndNotify(db, {
    userId: payload.userId,
    type: "xp",
    eventKey: `xp:${payload.habitType}:${payload.status}:${payload.date}:${payload.xpGained}`,
    title: "XP Earned",
    message: `✨ Great job! You earned ${payload.xpGained} XP. Only ${payload.xpToNextLevel} XP to level up!`,
  });
}

export async function syncHabitNotificationSchedules(
  db: SQLiteDatabase,
  payload: { userId: string; now?: Date },
) {
  await initNotificationTables(db);
  await cleanupExpiredScheduledNotifications(db, payload.userId, payload.now);

  for (const habitType of TRACKED_HABITS) {
    await scheduleStreakRiskForHabit(db, {
      userId: payload.userId,
      habitType,
      now: payload.now,
    });
  }
}

export async function recordDeliveredNotificationFromPayload(
  db: SQLiteDatabase,
  payload: Record<string, unknown> | null | undefined,
) {
  const userId = typeof payload?.userId === "string" ? payload.userId : null;
  const type = payload?.type;
  const title = typeof payload?.title === "string" ? payload.title : null;
  const message = typeof payload?.message === "string" ? payload.message : null;
  const eventKey = typeof payload?.eventKey === "string" ? payload.eventKey : null;

  if (
    !userId ||
    !title ||
    !message ||
    !eventKey ||
    (type !== "xp" && type !== "warning" && type !== "milestone")
  ) {
    return;
  }

  await insertNotificationDirect(db, {
    userId,
    type,
    title,
    message,
    eventKey,
  });
}

async function syncPendingNotificationQueue(db: SQLiteDatabase, userId: string) {
  const pending = await db.getAllAsync<{ id: number; notification_id: number }>(
    `
      SELECT id, notification_id
      FROM notification_queue
      WHERE user_id = ? AND sync_status = 0
      ORDER BY id ASC
      LIMIT 50
    `,
    [userId],
  );

  for (const item of pending) {
    await db.runAsync(`UPDATE notification_queue SET sync_status = 1 WHERE id = ?`, [item.id]);
  }
}

async function syncPendingHabitEvents(db: SQLiteDatabase, userId: string) {
  const pending = await db.getAllAsync<{
    id: number;
    habit_type: string;
    status: string;
    date: string;
    xp_gained: number;
  }>(
    `
      SELECT id, habit_type, status, date, xp_gained
      FROM habit_events
      WHERE user_id = ? AND sync_status = 0
      ORDER BY id ASC
      LIMIT 100
    `,
    [userId],
  );

  for (const item of pending) {
    const response = await supabase
      .from("habit_events")
      .upsert(
        {
          user_id: userId,
          habit_type: item.habit_type,
          status: item.status,
          date: item.date,
          xp_gained: item.xp_gained,
          local_id: item.id,
        },
        { onConflict: "user_id,habit_type,date" },
      )
      .select("id")
      .single();

    if (response.error) {
      break;
    }
    await db.runAsync(`UPDATE habit_events SET sync_status = 1, remote_id = ? WHERE id = ?`, [
      response.data?.id ? String(response.data.id) : null,
      item.id,
    ]);
  }
}

export async function processHabitEventAndNotify(
  db: SQLiteDatabase,
  payload: {
    userId: string;
    displayName?: string;
    habitType: HabitType;
    status: HabitStatus;
    date: string;
  },
) {
  try {
    await initNotificationTables(db);
    const gainedXp = xpByStatus(payload.status);
    const todayKey = toDateKey();
    const now = new Date();
    const localNotificationsToSend: LocalNotificationPayload[] = [];

    await db.withTransactionAsync(async () => {
      const existingEvent = await db.getFirstAsync<{ status: HabitStatus; xp_gained: number }>(
        `
          SELECT status, xp_gained
          FROM habit_events
          WHERE user_id = ? AND habit_type = ? AND date = ?
          LIMIT 1
        `,
        [payload.userId, payload.habitType, payload.date],
      );

      const noMeaningfulEventChange =
        existingEvent?.status === payload.status &&
        Number(existingEvent?.xp_gained ?? 0) === gainedXp;
      const xpDelta = Math.max(0, gainedXp - Number(existingEvent?.xp_gained ?? 0));

      if (noMeaningfulEventChange) {
        return;
      }

      await db.runAsync(
        `
          INSERT INTO habit_events (user_id, habit_type, status, date, xp_gained, sync_status)
          VALUES (?, ?, ?, ?, ?, 0)
          ON CONFLICT(user_id, habit_type, date) DO UPDATE SET
            status = excluded.status,
            xp_gained = excluded.xp_gained,
            sync_status = 0,
            updated_at = CURRENT_TIMESTAMP
        `,
        [payload.userId, payload.habitType, payload.status, payload.date, gainedXp],
      );

      const totalXpRow = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(xp_gained), 0) as total FROM habit_events WHERE user_id = ?`,
        [payload.userId],
      );
      const totalXp = totalXpRow?.total ?? 0;
      const level = Math.floor(totalXp / 100);
      const xpToNextLevel = Math.max(0, (level + 1) * 100 - totalXp);

      const streakRows = await db.getAllAsync<{ date: string }>(
        `
          SELECT DISTINCT date
          FROM habit_events
          WHERE user_id = ?
            AND status IN ('completed', 'partial')
          ORDER BY date ASC
        `,
        [payload.userId],
      );
      const streaks = computeStreaks(
        streakRows.map((item) => item.date),
        todayKey,
      );

      const latestDateRow = await db.getFirstAsync<{ max_date: string | null }>(
        `SELECT MAX(date) as max_date FROM habit_events WHERE user_id = ?`,
        [payload.userId],
      );
      const lastActivityDate = latestDateRow?.max_date ?? null;

      await db.runAsync(
        `
          INSERT INTO user_stats (
            user_id, total_xp, level, current_streak, longest_streak, last_activity_date, last_active_date, last_notified_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            total_xp = excluded.total_xp,
            level = excluded.level,
            current_streak = excluded.current_streak,
            longest_streak = excluded.longest_streak,
            last_activity_date = excluded.last_activity_date,
            last_active_date = excluded.last_active_date,
            last_notified_at = excluded.last_notified_at
        `,
        [
          payload.userId,
          totalXp,
          level,
          streaks.current,
          streaks.longest,
          lastActivityDate,
          lastActivityDate,
          now.toISOString(),
        ],
      );

      if (xpDelta > 0) {
        const reward = await triggerXPReward(db, {
          userId: payload.userId,
          habitType: payload.habitType,
          status: payload.status,
          date: payload.date,
          xpGained: xpDelta,
          xpToNextLevel,
        });
        if (reward?.notification) {
          localNotificationsToSend.push({
            ...reward.notification,
            data: {
              userId: payload.userId,
              type: "xp",
              title: reward.notification.title,
              message: reward.notification.body,
              eventKey: `xp:${payload.habitType}:${payload.status}:${payload.date}:${xpDelta}`,
            },
          });
        }
      }

      if (streaks.current > 0 && streaks.current % 5 === 0) {
        const milestone = await triggerStreakMilestone(db, {
          userId: payload.userId,
          displayName: payload.displayName ?? "Hafiz",
          streak: streaks.current,
        });
        if (milestone?.notification) {
          localNotificationsToSend.push({
            ...milestone.notification,
            data: {
              userId: payload.userId,
              type: "milestone",
              title: milestone.notification.title,
              message: milestone.notification.body,
              eventKey: `milestone:${streaks.current}:${toDateKey()}`,
            },
          });
        }
      }
    });

    await syncHabitNotificationSchedules(db, {
      userId: payload.userId,
      now,
    });

    for (const notification of localNotificationsToSend) {
      await sendLocalNotification(notification);
    }

    void syncPendingNotifications(db, payload.userId).catch(() => {
      // Keep offline-first behavior.
    });
    void syncPendingNotificationQueue(db, payload.userId).catch(() => {
      // Keep offline-first behavior.
    });
    void syncPendingHabitEvents(db, payload.userId).catch(() => {
      // Keep offline-first behavior.
    });
  } catch (error) {
    console.warn("Notification flow skipped without breaking the offline write:", error);
  }
}

export async function getLatestInAppNotification(
  db: SQLiteDatabase,
  userId: string,
) {
  return db.getFirstAsync<{
    id: number;
    type: "xp" | "warning" | "milestone";
    title: string;
    message: string;
    created_at: string;
  }>(
    `
      SELECT id, type, title, message, created_at
      FROM notifications
      WHERE user_id = ?
        AND is_read = 0
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [userId],
  );
}

export async function getUserGamificationStats(
  db: SQLiteDatabase,
  userId: string,
): Promise<UserStatsRow | null> {
  return db.getFirstAsync<UserStatsRow>(
    `
      SELECT user_id, total_xp, level, current_streak, longest_streak, last_activity_date, last_notified_at
      FROM user_stats
      WHERE user_id = ?
      LIMIT 1
    `,
    [userId],
  );
}
