import { ISurah } from "@/src/types";
import { IHifzPlan, IHifzLog } from "../types";
import { calculateFinishedDate, countPlannedDaysElapsed } from "./plan-calculations";
import { getNextTask, getPagesFromLog } from "./quran-logic";
import { getSurahNameByNumber } from "../../muraja/utils/quranMapping";

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

export const hifzStatus = (plan: IHifzPlan | null, surah?: ISurah[]) => {
  if (!plan || !surah) return null
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
    const {
    completedPages,
    successDays,
    lastLog,
    hasTodayLog,
    } = analyzeLogs(plan.hifz_daily_logs || []) ;
  
  const currentPage = lastLog ? lastLog.actual_end_page : plan.start_page;


   const nextTask = getNextTask(
    plan.direction,
    currentPage,
    plan.pages_per_day,
    surah,
    !lastLog
   );
  
  if (!nextTask) return null
  
    const missedCount = calculateMissedDays(
    plan,
    today,
    successDays,
    hasTodayLog
    );
  


  const plannedPages = missedCount * plan.pages_per_day;

  const accuracy = plannedPages === 0 ?
    100 : Math.min(Math.round((completedPages / plannedPages) * 100), 100)
    
  const progress =  Math.min(Math.round((completedPages / plan.total_pages) * 100), 100);
  const remainingPages = Math.max(0, plan.total_pages - completedPages);

   const { finishDate, daysNeeded } = calculateFinishedDate(
    currentPage,
    plan.direction,
    plan.pages_per_day,
    plan.selected_days.length || 1
  );

    return {
    progress,
    accuracy,
    missedCount,
    remainingPages,
    completedPages,
    successDays,

    currentPage,
    currentSurah: nextTask.startSurah,

    todayTarget: plan.pages_per_day,
    plannedPages,

    startSurah: getSurahNameByNumber(plan.start_surah, surah),
    endSurah: plan.direction === "forward" ? "An-Nas" : "Al-Fatihah",
    startPage: plan.start_page,
    endPage: plan.direction === "forward" ? 604 : 1,

    targetEndDate: finishDate,
    daysNeeded,
  };

}


export function analyzeLogs(logs: IHifzLog[]) {
  const today = new Date().toISOString().slice(0,10);

  let completedPages = 0
  let successDays = 0;
  let lastLog: IHifzLog | null = null
  let hasTodayLog = false;

  for (const log of logs) {
    if (log.date === today) {
      hasTodayLog = true
    }

    if (log.status === "completed" || log.status === "partial") {
      successDays++;
      completedPages += log.actual_pages_completed || 0
      
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
  }; 
}

function calculateMissedDays(
   plan: IHifzPlan,
  today: Date,
  successDays: number,
  hasTodayLog: boolean
) {
    const plannedDaysElapsed = countPlannedDaysElapsed(
    new Date(plan.start_date),
    today,
    plan.selected_days
  );

  const effectivePlannedDays =
    plannedDaysElapsed -
    (plan.selected_days.includes((today.getDay() + 6) % 7) && !hasTodayLog ? 1 : 0);

  return Math.max(0, effectivePlannedDays - successDays);
}

export const getWeeklyStatus = (plan: IHifzPlan | null, surahData?: ISurah[]) => {
  if(!plan) return
  const logs = plan.hifz_daily_logs || [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(plan.start_date);
  startDate.setHours(0, 0, 0, 0);

  const todayNumber = today.getDay();
  const todayIndex = (todayNumber + 6) % 7

  let pageCompleted = [] as number[]

  const week = dayNames.map((name, index) => {
    const dayDate = new Date(today);
    dayDate.setDate(today.getDate() - todayIndex + index);
    dayDate.setHours(0, 0, 0, 0);

    const isPlanned = plan.selected_days.includes(index);

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
