import { getLocalDateString } from "@/src/features/muraja/utils/murajaAnalytics";

type ActivityLog = {
  date?: string | null;
  status?: string | null;
};

/**
 * Evaluation stays due from the evaluation weekday until the user finishes it.
 * Passing the weekday without evaluating does not clear the flag.
 */
export function computeEvaluationDue(params: {
  evaluationDay: number;
  lastEvaluationDate?: string | null;
  selectedDays: number[];
  logs: ActivityLog[];
  today?: Date;
  minActivityRatio?: number;
}): boolean {
  const today = params.today ? new Date(params.today) : new Date();
  today.setHours(0, 0, 0, 0);

  const evalDay = ((params.evaluationDay % 7) + 7) % 7;
  const todayDay = (today.getDay() + 6) % 7;
  const daysSinceEval = (todayDay - evalDay + 7) % 7;

  const latestDue = new Date(today);
  latestDue.setDate(today.getDate() - daysSinceEval);
  const latestDueStr = getLocalDateString(latestDue);

  if (
    params.lastEvaluationDate &&
    params.lastEvaluationDate >= latestDueStr
  ) {
    return false;
  }

  const weekStart = new Date(latestDue);
  const dueDayIdx = (latestDue.getDay() + 6) % 7;
  weekStart.setDate(latestDue.getDate() - dueDayIdx);
  const weekStartStr = getLocalDateString(weekStart);

  const weekLogs = params.logs.filter((l) => {
    const date = l.date;
    if (!date || date < weekStartStr || date > latestDueStr) return false;
    return l.status === "completed" || l.status === "partial";
  });

  const activeDays = params.selectedDays?.length ?? 0;
  const minRequired = Math.max(
    1,
    Math.ceil(activeDays * (params.minActivityRatio ?? 0.25)),
  );

  return weekLogs.length >= minRequired;
}
