import { SQLiteDatabase } from "expo-sqlite";

export type ActivityType = "HIFZ" | "MURAJA" | "NORMAL_READING";
export type LegacyHabitType = "hifz" | "reading" | "review" | "understanding";
export type HabitType = ActivityType | LegacyHabitType;
export type ActivityEventType =
  | "HIFZ_COMPLETED"
  | "MURAJA_COMPLETED"
  | "NORMAL_READING_COMPLETED"
  | "TASK_UNDONE"
  | "TASK_MISSED";

type Totals = { minutes: number; units: number; sessions: number };

type HabitLogMetadata = {
  eventType?: ActivityEventType;
  sourceKey?: string;
  sourceDate?: string;
  status?: "completed" | "missed" | "undone";
  reference?: string | null;
  recordedAt?: string;
};

export type HabitProgressLog = {
  id: number;
  user_id: string;
  date: string;
  activity_type: ActivityType;
  note: string | null;
  metadata: string | null;
  plan_id: number | null;
  local_ref_id: number | null;
  minutes_spent: number;
  units_completed: number;
  remote_id: string | null;
  is_synced: number;
  created_at: string;
  updated_at: string;
};

export type HabitHistoryEntry = {
  id: number;
  type: ActivityEventType;
  timestamp: string;
  activityType: ActivityType;
  date: string;
  reference: string | null;
  minutes: number;
  units: number;
};

export type HabitProgressSnapshot = {
  userHistory: Array<{
    date: string;
    status: "completed" | "partial" | "missed" | "pending";
  }>;
  weekHistory: [];
  historyEntries: HabitHistoryEntry[];
  heatmap: { date: string; count: number; minutes: number }[];
  reflections: {
    id: number;
    date: string;
    reflection_text: string;
    activity_type: string;
    verses_read: number;
  }[];
  analytics: {
    completionRate: number;
    currentStreak: number;
    longestStreak: number;
    totalMinutes: number;
    totalPages: number;
    completedCount: number;
    missedCount: number;
    revisionFrequency: number;
  };
  progressByType: Record<ActivityType, Totals>;
  activityHash: string;
  lastActivityAt: string | null;
};

export async function initHabitProgressTables(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS quran_activity_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      activity_type TEXT NOT NULL CHECK(activity_type IN ('HIFZ', 'MURAJA', 'NORMAL_READING')),
      local_ref_id INTEGER,
      title TEXT,
      start_date TEXT,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      metadata TEXT,
      remote_id TEXT,
      is_synced INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_quran_activity_plans_user_type
      ON quran_activity_plans(user_id, activity_type, status);

    CREATE TABLE IF NOT EXISTS quran_activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      activity_type TEXT NOT NULL CHECK(activity_type IN ('HIFZ', 'MURAJA', 'NORMAL_READING')),
      plan_id INTEGER,
      local_ref_id INTEGER,
      minutes_spent INTEGER NOT NULL DEFAULT 0,
      units_completed INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      metadata TEXT,
      remote_id TEXT,
      is_synced INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(plan_id) REFERENCES quran_activity_plans(id)
    );

    CREATE INDEX IF NOT EXISTS idx_quran_activity_logs_user_date
      ON quran_activity_logs(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_quran_activity_logs_sync
      ON quran_activity_logs(user_id, is_synced);
    CREATE INDEX IF NOT EXISTS idx_quran_activity_logs_type
      ON quran_activity_logs(user_id, activity_type, date);

    CREATE TABLE IF NOT EXISTS quran_weekly_summary_seen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      week_key TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, week_key)
    );

    CREATE TABLE IF NOT EXISTS adaptive_guidance_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      activity_hash TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function normalizeActivityType(type: HabitType): ActivityType {
  if (type === "HIFZ" || type === "MURAJA" || type === "NORMAL_READING") {
    return type;
  }
  if (type === "hifz") return "HIFZ";
  if (type === "review") return "MURAJA";
  return "NORMAL_READING";
}

function defaultEventType(activityType: ActivityType): ActivityEventType {
  if (activityType === "HIFZ") return "HIFZ_COMPLETED";
  if (activityType === "MURAJA") return "MURAJA_COMPLETED";
  return "NORMAL_READING_COMPLETED";
}

function safeParseMetadata(metadata: string | null): HabitLogMetadata {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata) as HabitLogMetadata;
  } catch {
    return {};
  }
}

function buildSourceKey(activityType: ActivityType, date: string, planId?: number | null) {
  return `${activityType}:${planId ?? "na"}:${date}`;
}

function toTimestamp(date: string) {
  return new Date(date).toISOString();
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function minDateKey(left: string, right: string) {
  return left.localeCompare(right) <= 0 ? left : right;
}

function computeCurrentStreak(completedDates: string[], endDateKey: string) {
  const completedSet = new Set(completedDates);
  let streak = 0;
  const cursor = new Date(endDateKey);
  while (completedSet.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function computeLongestStreak(completedDates: string[]) {
  let longest = 0;
  let running = 0;
  let previous: Date | null = null;

  for (const date of completedDates) {
    const current = new Date(date);
    if (!previous) {
      running = 1;
    } else {
      const diff = Math.round(
        (current.getTime() - previous.getTime()) / (24 * 60 * 60 * 1000),
      );
      running = diff === 1 ? running + 1 : 1;
    }
    longest = Math.max(longest, running);
    previous = current;
  }

  return longest;
}

function computeActivityHash(
  entries: Array<{
    sourceDate: string;
    eventType: ActivityEventType;
    activity_type: ActivityType;
    minutes_spent: number;
    units_completed: number;
    plan_id: number | null;
  }>,
) {
  let hash = 2166136261;
  const raw = entries
    .sort((left, right) => left.sourceDate.localeCompare(right.sourceDate))
    .map((entry) =>
      [
        entry.sourceDate,
        entry.eventType,
        entry.activity_type,
        entry.minutes_spent ?? 0,
        entry.units_completed ?? 0,
        entry.plan_id ?? "na",
      ].join(":"),
    )
    .join("|");
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `v1-${(hash >>> 0).toString(16)}`;
}

export async function insertHabitProgressLog(
  db: SQLiteDatabase,
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
  },
) {
  await initHabitProgressTables(db);
  const activityType = normalizeActivityType(
    payload.activityType ?? payload.habitType ?? "NORMAL_READING",
  );
  const mergedMetadata = {
    ...safeParseMetadata(payload.metadata ?? null),
    eventType: payload.eventType ?? defaultEventType(activityType),
    status:
      payload.eventType === "TASK_UNDONE" ? "undone"
      : payload.eventType === "TASK_MISSED" ? "missed"
      : "completed",
    reference: payload.reference ?? null,
    sourceDate: payload.date,
    sourceKey: buildSourceKey(activityType, payload.date, payload.planId),
    recordedAt: payload.recordedAt ?? new Date().toISOString(),
  } satisfies HabitLogMetadata;

  const result = await db.runAsync(
    `
      INSERT INTO quran_activity_logs (
        user_id,
        date,
        activity_type,
        plan_id,
        local_ref_id,
        minutes_spent,
        units_completed,
        note,
        metadata,
        is_synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `,
    [
      payload.userId,
      payload.date,
      activityType,
      payload.planId ?? null,
      payload.localRefId ?? null,
      Math.max(0, Math.round(payload.minutesSpent)),
      Math.max(0, Math.round(payload.unitsCompleted)),
      payload.note ?? null,
      JSON.stringify(mergedMetadata),
    ],
  );

  return result.lastInsertRowId;
}

export async function upsertActivityPlan(
  db: SQLiteDatabase,
  payload: {
    userId: string;
    activityType: ActivityType;
    status?: "active" | "paused" | "completed";
    title?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    metadata?: string | null;
    localRefId?: number | null;
  },
) {
  await initHabitProgressTables(db);
  await db.runAsync(
    `
      UPDATE quran_activity_plans
      SET status = 'paused', updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND activity_type = ? AND status = 'active'
    `,
    [payload.userId, payload.activityType],
  );
  const result = await db.runAsync(
    `
      INSERT INTO quran_activity_plans (
        user_id, activity_type, local_ref_id, title, start_date, end_date, status, metadata, is_synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `,
    [
      payload.userId,
      payload.activityType,
      payload.localRefId ?? null,
      payload.title ?? null,
      payload.startDate ?? null,
      payload.endDate ?? null,
      payload.status ?? "active",
      payload.metadata ?? null,
    ],
  );
  return result.lastInsertRowId;
}

export async function getUnsyncedHabitLogs(db: SQLiteDatabase, userId: string) {
  return db.getAllAsync<HabitProgressLog>(
    `
      SELECT *
      FROM quran_activity_logs
      WHERE user_id = ? AND is_synced = 0
      ORDER BY id ASC
      LIMIT 200
    `,
    [userId],
  );
}

export async function markHabitLogSynced(
  db: SQLiteDatabase,
  id: number,
  remoteId: string | null,
) {
  await db.runAsync(
    `
      UPDATE quran_activity_logs
      SET is_synced = 1, remote_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [remoteId, id],
  );
}

export async function getHabitTypeTotals(
  db: SQLiteDatabase,
  userId: string,
  startDate: string,
  endDate: string,
) {
  const rows = await db.getAllAsync<{
    activity_type: ActivityType;
    minutes: number;
    units: number;
    sessions: number;
  }>(
    `
      SELECT
        activity_type,
        SUM(minutes_spent) as minutes,
        SUM(units_completed) as units,
        COUNT(*) as sessions
      FROM quran_activity_logs
      WHERE user_id = ? AND date BETWEEN ? AND ?
      GROUP BY activity_type
    `,
    [userId, startDate, endDate],
  );

  const result: Record<ActivityType, Totals> = {
    HIFZ: { minutes: 0, units: 0, sessions: 0 },
    MURAJA: { minutes: 0, units: 0, sessions: 0 },
    NORMAL_READING: { minutes: 0, units: 0, sessions: 0 },
  };

  for (const row of rows) {
    result[row.activity_type] = {
      minutes: row.minutes ?? 0,
      units: row.units ?? 0,
      sessions: row.sessions ?? 0,
    };
  }

  return result;
}

export async function getHabitProgressSnapshot(
  db: SQLiteDatabase,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<HabitProgressSnapshot> {
  const logs = await db.getAllAsync<HabitProgressLog>(
    `
      SELECT *
      FROM quran_activity_logs
      WHERE user_id = ? AND date <= ?
      ORDER BY date ASC, id ASC
    `,
    [userId, endDate],
  );

  const progressByType: Record<ActivityType, Totals> = {
    HIFZ: { minutes: 0, units: 0, sessions: 0 },
    MURAJA: { minutes: 0, units: 0, sessions: 0 },
    NORMAL_READING: { minutes: 0, units: 0, sessions: 0 },
  };
  const finalBySource = new Map<
    string,
    HabitProgressLog & { parsedMetadata: HabitLogMetadata; eventType: ActivityEventType; sourceDate: string }
  >();
  const historyEntries: HabitHistoryEntry[] = [];
  const reflections: HabitProgressSnapshot["reflections"] = [];

  for (const log of logs) {
    const parsedMetadata = safeParseMetadata(log.metadata ?? null);
    const eventType = parsedMetadata.eventType ?? defaultEventType(log.activity_type);
    const sourceDate = parsedMetadata.sourceDate ?? log.date;
    const sourceKey =
      parsedMetadata.sourceKey ?? buildSourceKey(log.activity_type, sourceDate, log.plan_id);
    const timestamp = parsedMetadata.recordedAt ?? log.updated_at ?? log.created_at ?? toTimestamp(log.date);

    finalBySource.set(sourceKey, { ...log, parsedMetadata, eventType, sourceDate });

    if (sourceDate >= startDate && sourceDate <= endDate) {
      historyEntries.push({
        id: log.id,
        type: eventType,
        timestamp,
        activityType: log.activity_type,
        date: sourceDate,
        reference: parsedMetadata.reference ?? null,
        minutes: log.minutes_spent,
        units: log.units_completed,
      });
    }

    if (log.note && log.note.trim()) {
      reflections.push({
        id: log.id,
        date: sourceDate,
        reflection_text: log.note,
        activity_type: log.activity_type,
        verses_read: log.units_completed,
      });
    }
  }

  const finalizedEntries = Array.from(finalBySource.values()).filter(
    (entry) => entry.sourceDate >= startDate && entry.sourceDate <= endDate,
  );
  const lastActivityAt = finalizedEntries
    .map((entry) => entry.parsedMetadata.recordedAt ?? entry.updated_at ?? entry.created_at ?? null)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => right.localeCompare(left))[0] ?? null;
  const groupedByDate = new Map<
    string,
    Array<typeof finalizedEntries[number]>
  >();

  for (const entry of finalizedEntries) {
    const next = groupedByDate.get(entry.sourceDate) ?? [];
    next.push(entry);
    groupedByDate.set(entry.sourceDate, next);

    if (
      entry.eventType === "HIFZ_COMPLETED" ||
      entry.eventType === "MURAJA_COMPLETED" ||
      entry.eventType === "NORMAL_READING_COMPLETED"
    ) {
      progressByType[entry.activity_type].minutes += entry.minutes_spent ?? 0;
      progressByType[entry.activity_type].units += entry.units_completed ?? 0;
      progressByType[entry.activity_type].sessions += 1;
    }
  }

  const userHistory = Array.from(groupedByDate.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, entries]) => {
      const hasCompleted = entries.some((entry) =>
        entry.eventType === "HIFZ_COMPLETED" ||
        entry.eventType === "MURAJA_COMPLETED" ||
        entry.eventType === "NORMAL_READING_COMPLETED",
      );
      const hasMissed = entries.some((entry) => entry.eventType === "TASK_MISSED");

      return {
        date,
        status:
          hasCompleted && hasMissed ? ("partial" as const)
          : hasCompleted ? ("completed" as const)
          : hasMissed ? ("missed" as const)
          : ("pending" as const),
      };
    });

  const completedDates = userHistory
    .filter((item) => item.status === "completed" || item.status === "partial")
    .map((item) => item.date);
  const completedCount = finalizedEntries.filter((entry) =>
    entry.eventType === "HIFZ_COMPLETED" ||
    entry.eventType === "MURAJA_COMPLETED" ||
    entry.eventType === "NORMAL_READING_COMPLETED",
  ).length;
  const missedCount = finalizedEntries.filter((entry) => entry.eventType === "TASK_MISSED").length;
  const totalTracked = completedCount + missedCount;
  const totalMinutes = Object.values(progressByType).reduce((acc, item) => acc + item.minutes, 0);
  const totalPages = Object.values(progressByType).reduce((acc, item) => acc + item.units, 0);
  const murajaSessions = progressByType.MURAJA.sessions;
  const rangeDays = Math.max(
    1,
    Math.round(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000),
    ) + 1,
  );

  const heatmap = Array.from(groupedByDate.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, entries]) => ({
      date,
      count: entries.filter((entry) =>
        entry.eventType === "HIFZ_COMPLETED" ||
        entry.eventType === "MURAJA_COMPLETED" ||
        entry.eventType === "NORMAL_READING_COMPLETED",
      ).length,
      minutes: entries.reduce((acc, entry) => acc + entry.minutes_spent, 0),
    }));

  return {
    userHistory,
    weekHistory: [],
    historyEntries: historyEntries.sort((left, right) =>
      right.timestamp.localeCompare(left.timestamp),
    ),
    heatmap,
    reflections: reflections
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, 20),
    analytics: {
      completionRate: Math.round((completedCount / Math.max(1, totalTracked)) * 100),
      currentStreak: computeCurrentStreak(
        completedDates,
        minDateKey(endDate, toDateKey(new Date())),
      ),
      longestStreak: computeLongestStreak([...completedDates].sort()),
      totalMinutes,
      totalPages,
      completedCount,
      missedCount,
      revisionFrequency: Number(((murajaSessions / rangeDays) * 7).toFixed(1)),
    },
    progressByType,
    activityHash: computeActivityHash(finalizedEntries),
    lastActivityAt,
  };
}

export async function getCachedGuidance(
  db: SQLiteDatabase,
  userId: string,
) {
  return db.getFirstAsync<{ activity_hash: string; payload: string }>(
    `
      SELECT activity_hash, payload
      FROM adaptive_guidance_cache
      WHERE user_id = ?
      LIMIT 1
    `,
    [userId],
  );
}

export async function upsertCachedGuidance(
  db: SQLiteDatabase,
  payload: {
    userId: string;
    activityHash: string;
    data: unknown;
  },
) {
  await db.runAsync(
    `
      INSERT INTO adaptive_guidance_cache (user_id, activity_hash, payload, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        activity_hash = excluded.activity_hash,
        payload = excluded.payload,
        updated_at = CURRENT_TIMESTAMP
    `,
    [payload.userId, payload.activityHash, JSON.stringify(payload.data)],
  );
}

export async function getHabitCalendarStatus(
  db: SQLiteDatabase,
  userId: string,
  startDate: string,
  endDate: string,
) {
  const rows = await db.getAllAsync<{ date: string; sessions: number }>(
    `
      SELECT date, COUNT(*) as sessions
      FROM quran_activity_logs
      WHERE user_id = ? AND date BETWEEN ? AND ?
      GROUP BY date
      ORDER BY date ASC
    `,
    [userId, startDate, endDate],
  );

  return rows.map((row) => ({
    date: row.date,
    status: row.sessions > 0 ? ("completed" as const) : ("pending" as const),
  }));
}

export async function getRecentHabitLogs(db: SQLiteDatabase, userId: string, limit = 16) {
  return db.getAllAsync<HabitProgressLog>(
    `
      SELECT *
      FROM quran_activity_logs
      WHERE user_id = ?
      ORDER BY date DESC, id DESC
      LIMIT ?
    `,
    [userId, limit],
  );
}

function getWeekKey(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export async function shouldShowWeeklySummary(db: SQLiteDatabase, userId: string, now = new Date()) {
  const day = now.getDay();
  const isWeekend = day === 0 || day === 6;
  if (!isWeekend) return false;
  const weekKey = getWeekKey(now);
  const row = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM quran_weekly_summary_seen WHERE user_id = ? AND week_key = ? LIMIT 1`,
    [userId, weekKey],
  );
  return !row;
}

export async function markWeeklySummarySeen(db: SQLiteDatabase, userId: string, now = new Date()) {
  await db.runAsync(
    `INSERT OR IGNORE INTO quran_weekly_summary_seen (user_id, week_key) VALUES (?, ?)`,
    [userId, getWeekKey(now)],
  );
}
