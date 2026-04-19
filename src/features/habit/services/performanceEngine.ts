import { SQLiteDatabase } from "expo-sqlite";
import { getHabitProgressSnapshot } from "@/src/features/habits/services/habitProgressService";

export type PerformanceSummary = {
  completionRate: number;
  missedPages: number[];
  streak: number;
};

export type GuidanceInputSnapshot = {
  summary: PerformanceSummary;
  fingerprint: string;
};

type MissedPageRow = {
  actual_start_page: number;
  actual_end_page: number;
};

type PerformanceInput = {
  completedDates: string[];
  missedPageRanges: { startPage: number; endPage: number }[];
  expectedDays: number;
  untilDate: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function expandPageRange(startPage: number, endPage: number): number[] {
  if (!Number.isFinite(startPage) || !Number.isFinite(endPage)) return [];
  const from = Math.max(1, Math.min(startPage, endPage));
  const to = Math.max(1, Math.max(startPage, endPage));
  const pages: number[] = [];
  for (let page = from; page <= to; page += 1) {
    pages.push(page);
  }
  return pages;
}

function buildDateWindow(days: number, untilDate = new Date()) {
  const safeDays = Math.max(1, Math.round(days));
  const end = new Date(untilDate.getFullYear(), untilDate.getMonth(), untilDate.getDate());
  const start = new Date(end.getTime() - (safeDays - 1) * DAY_MS);
  return {
    startKey: toDateKey(start),
    endKey: toDateKey(end),
    expectedDays: safeDays,
  };
}

function computeStreakFromDates(completedDates: string[], untilDateKey: string): number {
  const completedSet = new Set(completedDates);
  let streak = 0;
  const cursor = fromDateKey(untilDateKey);

  while (completedSet.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function calculatePerformanceSummary(input: PerformanceInput): PerformanceSummary {
  const completedUniqueDays = new Set(input.completedDates).size;
  const completionRate = Math.round((completedUniqueDays / Math.max(1, input.expectedDays)) * 100);
  const missedPages = Array.from(
    new Set(
      input.missedPageRanges.flatMap((range) => expandPageRange(range.startPage, range.endPage)),
    ),
  ).sort((a, b) => a - b);

  return {
    completionRate: Math.max(0, Math.min(100, completionRate)),
    missedPages,
    streak: computeStreakFromDates(input.completedDates, input.untilDate),
  };
}

export async function getPerformanceSummary(
  db: SQLiteDatabase,
  userId: string,
  options?: { days?: number; untilDate?: Date },
): Promise<PerformanceSummary> {
  const snapshot = await getGuidanceInputSnapshot(db, userId, options);
  return snapshot.summary;
}

export async function getGuidanceInputSnapshot(
  db: SQLiteDatabase,
  userId: string,
  options?: { days?: number; untilDate?: Date },
): Promise<GuidanceInputSnapshot> {
  const window = buildDateWindow(options?.days ?? 14, options?.untilDate ?? new Date());
  const snapshot = await getHabitProgressSnapshot(
    db,
    userId,
    window.startKey,
    window.endKey,
  );

  let missedRows: MissedPageRow[] = [];
  try {
    missedRows = await db.getAllAsync<MissedPageRow>(
      `
        SELECT actual_start_page, actual_end_page
        FROM hifz_logs_local
        WHERE user_id = ?
          AND date BETWEEN ? AND ?
          AND (status = 'missed' OR actual_pages_completed = 0)
      `,
      [userId, window.startKey, window.endKey],
    );
  } catch {
    // If the hifz table is not initialized yet, missed pages stay empty.
  }

  const summary = calculatePerformanceSummary({
    completedDates: snapshot.userHistory
      .filter((row) => row.status === "completed" || row.status === "partial")
      .map((row) => row.date),
    missedPageRanges: missedRows.map((row) => ({
      startPage: row.actual_start_page,
      endPage: row.actual_end_page,
    })),
    expectedDays: window.expectedDays,
    untilDate: window.endKey,
  });

  const missedSignature = missedRows
    .map((row) => `${row.actual_start_page}-${row.actual_end_page}`)
    .sort()
    .join("|");

  return {
    summary,
    fingerprint: [
      `window:${window.startKey}:${window.endKey}`,
      `activity:${snapshot.activityHash}`,
      `missed:${missedSignature}`,
      `last:${snapshot.lastActivityAt ?? "na"}`,
    ].join(":"),
  };
}

export function getSamplePerformanceSummary(): PerformanceSummary {
  return calculatePerformanceSummary({
    completedDates: [
      "2026-04-10",
      "2026-04-11",
      "2026-04-13",
      "2026-04-14",
      "2026-04-15",
      "2026-04-16",
    ],
    missedPageRanges: [
      { startPage: 25, endPage: 25 },
      { startPage: 40, endPage: 41 },
    ],
    expectedDays: 7,
    untilDate: "2026-04-16",
  });
}
