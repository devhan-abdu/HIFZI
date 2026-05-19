import { IHifzPlan } from "../types";

export type HifzPageRange = { minPage: number; maxPage: number };

/** Pages the user has memorized within their active hifz plan. */
export function getHifzMemorizedRange(plan: IHifzPlan): HifzPageRange | null {
  const completedLogs = (plan.hifzDailyLogs ?? []).filter(
    (log) => log.status === "completed" || log.status === "partial",
  );

  if (completedLogs.length === 0) {
    return { minPage: plan.startPage, maxPage: plan.startPage };
  }

  const lastLog = [...completedLogs].sort((a, b) =>
    b.date.localeCompare(a.date),
  )[0];
  const currentPage = lastLog.actualEndPage;

  if (plan.direction === "forward") {
    return { minPage: plan.startPage, maxPage: currentPage };
  }

  return { minPage: currentPage, maxPage: plan.startPage };
}

export function isPageInHifzRange(
  page: number,
  range: HifzPageRange | null,
): boolean {
  if (!range) return false;
  return page >= range.minPage && page <= range.maxPage;
}
