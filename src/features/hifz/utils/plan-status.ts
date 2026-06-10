import { ISurah } from "@/src/types";
import { IHifzPlan, IHifzLog } from "../types";
import { calculateFinishedDate, countPlannedDaysElapsed } from "./plan-calculations";
import { getNextTask, getPagesFromLog } from "./quran-logic";
import {
  getPagePositionLabel,
  getSurahNameByNumber,
  getSurah,
} from "../../muraja/utils/quranMapping";

const dayNames = [ "Mon", "Tue", "Wed", "Thu", "Fri", "Sat","Sun",];

export const isWithinCurrentWeek = (date: Date) => {
  const now = new Date();

   const day = (now.getDay() + 6) % 7;

  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() -day);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return date >= startOfWeek && date <= endOfWeek;
};

export const hifzStatus = (
  plan: IHifzPlan | null,
  surah?: ISurah[],
  referenceDate?: Date,
) => {
  if (!plan || !surah) return null;

  const today = referenceDate ? new Date(referenceDate) : new Date();
  today.setHours(0, 0, 0, 0);

  const referenceDateKey = today.toISOString().slice(0, 10);

  const {
    completedPages,
    successDays,
    lastLog,
    hasTodayLog,
    avgQuality,
    completedDays,
    partialDays,
  } = analyzeLogs(plan.hifzDailyLogs || [], referenceDateKey);
  
  const currentPage = lastLog ? lastLog.actualEndPage : plan.startPage;


  const isPaused = plan.pagesPerDay <= 0;
  const nextTask = isPaused
    ? null
    : getNextTask(
        plan.direction,
        currentPage,
        plan.pagesPerDay,
        surah,
        !lastLog
      );

  const pagePosition = getPagePositionLabel(currentPage, surah);
  const currentSurah =
    pagePosition.surahName !== "—"
      ? pagePosition.surahName
      : nextTask?.startSurah ??
        getSurahNameByNumber(plan.startSurah, surah);
  
    const missedCount = calculateMissedDays(
    plan,
    today,
    successDays,
    hasTodayLog
    );
  
  const plannedPages = missedCount * Math.max(0, plan.pagesPerDay);

  const accuracy = (plannedPages + completedPages) === 0 ?
    100 : Math.min(Math.round((completedPages / (plannedPages + completedPages)) * 100), 100)
    
  const progress =  Math.min(Math.round((completedPages / plan.totalPages) * 100), 100);
  const remainingPages = Math.max(0, plan.totalPages - completedPages);

  const { finishDate, daysNeeded } = isPaused
    ? { finishDate: "Paused", daysNeeded: 0 }
    : calculateFinishedDate(
        currentPage,
        plan.direction,
        plan.pagesPerDay,
        plan.selectedDays.length || 1,
        plan.totalPages,
        plan.startPage,
        remainingPages
      );

    const derivedEndPage = plan.direction === 'forward'
      ? Math.min(604, plan.startPage + plan.totalPages - 1)
      : Math.max(1, plan.startPage - plan.totalPages + 1);
    const derivedEndSurah = getSurah(derivedEndPage, surah);

    return {
    progress,
    accuracy,
    missedCount,
    remainingPages,
    completedPages,
    successDays,
    avgQuality,
    completedDays,
    partialDays,
    startDate: plan.startDate,
    totalExpectedPages: plan.totalPages,

    currentPage,
    currentSurah,
    pageInSurah: pagePosition.pageInSurah,

    todayTarget: plan.pagesPerDay,
    plannedPages,

    startSurah: getSurahNameByNumber(plan.startSurah, surah),
    endSurah: derivedEndSurah?.englishName ?? getSurahNameByNumber(plan.startSurah, surah),
    startPage: plan.startPage,
    endPage: derivedEndPage,

    targetEndDate: finishDate,
    daysNeeded,
  };
};

/**
 * Pace vs schedule: expected memorized pages (through yesterday + today only if logged)
 * minus actual completed pages. Positive = behind, negative = ahead.
 */
export function getHifzPaceDelta(plan: IHifzPlan, surah: ISurah[]) {
  const status = hifzStatus(plan, surah);
  if (!status) {
    return { delta: 0, expectedPages: 0, completedPages: 0 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = today.toISOString().slice(0, 10);
  const todayIndex = (today.getDay() + 6) % 7;

  let expectedPages =
    countPlannedDaysElapsed(
      new Date(plan.startDate),
      today,
      plan.selectedDays,
    ) * plan.pagesPerDay;

  const todayLog = (plan.hifzDailyLogs ?? []).find((l) => l.date === todayKey);
  const loggedToday =
    todayLog?.status === "completed" || todayLog?.status === "partial";

  if (plan.selectedDays.includes(todayIndex) && !loggedToday) {
    expectedPages = Math.max(0, expectedPages - plan.pagesPerDay);
  }

  return {
    delta: expectedPages - status.completedPages,
    expectedPages,
    completedPages: status.completedPages,
  };
}


export function analyzeLogs(logs: IHifzLog[], referenceDateKey?: string) {
  const today = referenceDateKey ?? new Date().toISOString().slice(0, 10);

  let completedPages = 0
  let successDays = 0;
  let lastLog: IHifzLog | null = null
  let hasTodayLog = false;
  let totalQuality = 0;
  let qualityCount = 0;
  let completedDays = 0;
  let partialDays = 0;

  for (const log of logs) {
    if (log.date === today) {
      hasTodayLog = true
    }

    if (log.status === "completed" || log.status === "partial") {
      successDays++;
      completedPages += log.actualPagesCompleted || 0
      
      if (log.status === 'completed') completedDays++;
      else partialDays++;

      if (log.qualityScore) {
        totalQuality += log.qualityScore;
        qualityCount++;
      }

      if (!lastLog || log.date > lastLog?.date)
      {
        lastLog = log
      }
    }
  }

   return {
    completedPages,
    successDays,
    lastLog,
    hasTodayLog,
    avgQuality: qualityCount > 0 ? parseFloat((totalQuality / qualityCount).toFixed(1)) : 0,
    completedDays,
    partialDays,
  }; 
}

function calculateMissedDays(
   plan: IHifzPlan,
  today: Date,
  successDays: number,
  hasTodayLog: boolean
) {
    const plannedDaysElapsed = countPlannedDaysElapsed(
    new Date(plan.startDate),
    today,
    plan.selectedDays
  );

  const effectivePlannedDays =
    plannedDaysElapsed -
    (plan.selectedDays.includes((today.getDay() + 6) % 7) && !hasTodayLog ? 1 : 0);

  return Math.max(0, effectivePlannedDays - successDays);
}

/** Last calendar day with a successful log, or plan start if none. */
export function getHifzPlanEndDate(plan: IHifzPlan): string {
  const successLogs = (plan.hifzDailyLogs ?? []).filter(
    (log) => log.status === "completed" || log.status === "partial",
  );
  if (successLogs.length === 0) return plan.startDate;
  return successLogs.reduce(
    (max, log) => (log.date > max ? log.date : max),
    plan.startDate,
  );
}

export const getWeeklyStatus = (plan: IHifzPlan | null, surahData?: ISurah[]) => {
  if(!plan) return
  const logs = plan.hifzDailyLogs || [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(plan.startDate);
  startDate.setHours(0, 0, 0, 0);

  const todayNumber = today.getDay();
  const todayIndex = (todayNumber + 6) % 7

  let pageCompleted = [] as number[]

  const week = dayNames.map((name, index) => {
    const dayDate = new Date(today);
    dayDate.setDate(today.getDate() - todayIndex + index);
    dayDate.setHours(0, 0, 0, 0);

    const isPlanned = plan.selectedDays.includes(index);

    return {
      name,
      isPlanned,
      isToday: index === todayIndex,
      isPast: isPlanned && dayDate < today && dayDate >= startDate,
      log: null as IHifzLog | null,
    };
  });

  logs.forEach((log) => {
    const logDate = new Date(log.date);

    if (isWithinCurrentWeek(logDate)) {
      const logDayIndex = (logDate.getDay() + 6 ) % 7;
      week[logDayIndex].log = log;
      if (surahData) {
           const pagesFromLog = getPagesFromLog(log, plan.direction, surahData);
         pageCompleted.push(...pagesFromLog);      }
    }
  });

  pageCompleted = Array.from(new Set(pageCompleted));
  return { week , pageCompleted};
};
