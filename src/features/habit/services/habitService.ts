import { SQLiteDatabase } from "expo-sqlite";

export type HabitActivityType = "normal_reading" | "mini_goal" | "muraja" | "hifz";

export type DailyActivityInput = {
  userId: string;
  date?: string;
  minutesSpent: number;
  versesRead: number;
  activityType: HabitActivityType;
  reflectionText?: string | null;
};

export type UserHabitStats = {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  streakFreezes: number;
};

export type HabitHeatmapPoint = {
  date: string;
  count: number;
  minutes: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
}

function diffCalendarDays(fromDateKey: string, toDateKey: string) {
  const from = parseDateKey(fromDateKey);
  const to = parseDateKey(toDateKey);
  const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const toMidnight = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((toMidnight - fromMidnight) / DAY_MS);
}

async function ensureColumn(
  db: SQLiteDatabase,
  table: string,
  column: string,
  definition: string,
) {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  const hasColumn = columns.some((item) => item.name === column);
  if (!hasColumn) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export async function initHabitTables(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS HabitLogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      minutes_spent INTEGER NOT NULL DEFAULT 0,
      verses_read INTEGER NOT NULL DEFAULT 0,
      activity_type TEXT NOT NULL DEFAULT 'normal_reading',
      reflection_text TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON HabitLogs (user_id, date);
    CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON HabitLogs (date);
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_stats (
      user_id TEXT PRIMARY KEY
    );
  `);

  await ensureColumn(db, "user_stats", "current_streak", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "user_stats", "longest_streak", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "user_stats", "last_active_date", "TEXT");
  await ensureColumn(db, "user_stats", "streak_freezes", "INTEGER NOT NULL DEFAULT 0");
}

export async function getHabitUserStats(
  db: SQLiteDatabase,
  userId: string,
): Promise<UserHabitStats> {
  const existing = await db.getFirstAsync<{
    current_streak: number;
    longest_streak: number;
    last_active_date: string | null;
    streak_freezes: number;
  }>(
    `
      SELECT current_streak, longest_streak, last_active_date, streak_freezes
      FROM user_stats
      WHERE user_id = ?
      LIMIT 1
    `,
    [userId],
  );

  if (!existing) {
    await db.runAsync(
      `
        INSERT OR IGNORE INTO user_stats (user_id, current_streak, longest_streak, last_active_date, streak_freezes)
        VALUES (?, 0, 0, NULL, 0)
      `,
      [userId],
    );

    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      streakFreezes: 0,
    };
  }

  return {
    currentStreak: existing.current_streak ?? 0,
    longestStreak: existing.longest_streak ?? 0,
    lastActiveDate: existing.last_active_date ?? null,
    streakFreezes: existing.streak_freezes ?? 0,
  };
}

export async function processDailyActivity(
  db: SQLiteDatabase,
  activity: DailyActivityInput,
): Promise<UserHabitStats> {
  const today = activity.date ?? getLocalDateKey();
  let updatedStats: UserHabitStats = {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: today,
    streakFreezes: 0,
  };

  await db.withTransactionAsync(async () => {
    const stats = await getHabitUserStats(db, activity.userId);
    const isMiniGoal = activity.activityType === "mini_goal";

    let nextCurrent = stats.currentStreak;
    let nextLongest = stats.longestStreak;
    let nextLastActive = stats.lastActiveDate;
    let nextFreezes = stats.streakFreezes;

    if (!stats.lastActiveDate) {
      nextCurrent = 1;
      nextLongest = Math.max(stats.longestStreak, 1);
      nextLastActive = today;
    } else {
      const dayGap = diffCalendarDays(stats.lastActiveDate, today);

      if (dayGap <= 0) {
        // Same day: keep streak unchanged.
      } else if (dayGap === 1) {
        nextCurrent = stats.currentStreak + 1;
        nextLongest = Math.max(stats.longestStreak, nextCurrent);
        nextLastActive = today;
      } else if (nextFreezes > 0) {
        nextFreezes -= 1;
        nextLastActive = today;
      } else {
        // Mini-goal acts as a streak saver for long gaps.
        nextCurrent = isMiniGoal ? Math.max(stats.currentStreak, 1) : 1;
        nextLongest = Math.max(stats.longestStreak, nextCurrent);
        nextLastActive = today;
      }
    }

    await db.runAsync(
      `
        INSERT INTO user_stats (
          user_id,
          current_streak,
          longest_streak,
          last_active_date,
          streak_freezes
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          current_streak = excluded.current_streak,
          longest_streak = excluded.longest_streak,
          last_active_date = excluded.last_active_date,
          streak_freezes = excluded.streak_freezes
      `,
      [activity.userId, nextCurrent, nextLongest, nextLastActive, nextFreezes],
    );
    updatedStats = {
      currentStreak: nextCurrent,
      longestStreak: nextLongest,
      lastActiveDate: nextLastActive,
      streakFreezes: nextFreezes,
    };

    await db.runAsync(
      `
        INSERT INTO HabitLogs (
          user_id,
          date,
          minutes_spent,
          verses_read,
          activity_type,
          reflection_text
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        activity.userId,
        today,
        Math.max(0, Math.round(activity.minutesSpent)),
        Math.max(0, Math.round(activity.versesRead)),
        activity.activityType,
        activity.reflectionText ?? null,
      ],
    );
  });

  return updatedStats;
}

export async function updateDailyReflection(
  db: SQLiteDatabase,
  userId: string,
  date: string,
  reflectionText: string,
) {
  const latest = await db.getFirstAsync<{ id: number }>(
    `
      SELECT id
      FROM HabitLogs
      WHERE user_id = ? AND date = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [userId, date],
  );

  if (!latest?.id) {
    return;
  }

  await db.runAsync(
    `
      UPDATE HabitLogs
      SET reflection_text = ?
      WHERE id = ?
    `,
    [reflectionText, latest.id],
  );
}

export async function getLast365HeatmapData(
  db: SQLiteDatabase,
  userId: string,
): Promise<HabitHeatmapPoint[]> {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 364);
  const fromKey = getLocalDateKey(from);

  const rows = await db.getAllAsync<{
    date: string;
    count: number;
    minutes: number;
  }>(
    `
      SELECT date, COUNT(*) as count, SUM(minutes_spent) as minutes
      FROM HabitLogs
      WHERE user_id = ? AND date >= ?
      GROUP BY date
      ORDER BY date ASC
    `,
    [userId, fromKey],
  );

  return rows.map((row) => ({
    date: row.date,
    count: row.count ?? 0,
    minutes: row.minutes ?? 0,
  }));
}

export async function getReflectionHistory(
  db: SQLiteDatabase,
  userId: string,
  limit = 30,
) {
  return db.getAllAsync<{
    id: number;
    date: string;
    reflection_text: string;
    activity_type: string;
    verses_read: number;
  }>(
    `
      SELECT id, date, reflection_text, activity_type, verses_read
      FROM HabitLogs
      WHERE user_id = ? AND reflection_text IS NOT NULL AND TRIM(reflection_text) != ''
      ORDER BY date DESC, id DESC
      LIMIT ?
    `,
    [userId, limit],
  );
}

export function getTodayKey() {
  return getLocalDateKey();
}
