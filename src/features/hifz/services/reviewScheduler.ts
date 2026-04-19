type ReviewCycleDay = 1 | 2 | 3;

export type ReviewScheduleState = {
  cycleDay: ReviewCycleDay;
  nextReviewDate: string;
};

export type ReviewResultType = "completed" | "missed";

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

function addDays(baseDate: string, days: number): string {
  const date = fromDateKey(baseDate);
  const next = new Date(date.getTime() + days * DAY_MS);
  return toDateKey(next);
}

function scheduleByCycleDay(baseDate: string, cycleDay: ReviewCycleDay): string {
  if (cycleDay === 1) return addDays(baseDate, 1);
  if (cycleDay === 2) return addDays(baseDate, 3);
  return addDays(baseDate, 7);
}

export function createInitialReviewSchedule(fromDate: string): ReviewScheduleState {
  return {
    cycleDay: 1,
    nextReviewDate: scheduleByCycleDay(fromDate, 1),
  };
}

export function getNextReviewSchedule(
  current: ReviewScheduleState,
  result: ReviewResultType,
  completedAt: string,
): ReviewScheduleState {
  if (result === "missed") {
    return {
      cycleDay: 1,
      nextReviewDate: scheduleByCycleDay(completedAt, 1),
    };
  }

  const nextCycle: ReviewCycleDay = current.cycleDay === 1 ? 2 : current.cycleDay === 2 ? 3 : 3;
  return {
    cycleDay: nextCycle,
    nextReviewDate: scheduleByCycleDay(completedAt, nextCycle),
  };
}

export function getSampleReviewSchedulerOutput() {
  const start = createInitialReviewSchedule("2026-04-16");
  const afterDay1 = getNextReviewSchedule(start, "completed", "2026-04-17");
  const afterDay2 = getNextReviewSchedule(afterDay1, "completed", "2026-04-20");
  const afterMiss = getNextReviewSchedule(afterDay2, "missed", "2026-04-27");

  return {
    start,
    afterDay1,
    afterDay2,
    afterMiss,
  };
}
