import { ISurah } from "@/src/types";
import { HifzPlanSchemaFormType, IHifzLog, IHifzPlan } from "../types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
//this one is used to get finshed date but  ut i need  the status calulation not from start but last logged page
export const calculatePlanStats = (data: HifzPlanSchemaFormType) => {
  
  const totalQuranPages = 604;
  const startPage = Number(data.start_page) || 1;
  const dailyRate = Number(data.pages_per_day) || 1;
  const weeklyFreq = data.selectedDays?.length || 1;

  const totalPages = data.direction === "forward" 
    ? totalQuranPages - startPage + 1 
    : startPage;

  const sessionNeeded = Math.ceil(totalPages / dailyRate);
  let daysNeeded = 1;
  if (sessionNeeded > 1) {
    daysNeeded = Math.ceil(((sessionNeeded - 1) / weeklyFreq) * 7) + 1;
  }

  const finishDate = new Date(data.start_date || new Date());
  if (!isNaN(daysNeeded) && isFinite(daysNeeded)) {
    finishDate.setDate(finishDate.getDate() + (daysNeeded - 1));
  }

  return { 
    totalPages, 
    finishDate, 
    daysNeeded,
    targetSurah: data.direction === "forward" ? "An-Nas" : "Al-Fatihah" 
  };
};

export const calculateFinishedDate = (currentPage: number, direction: "forward" | "backward", pagesPerDay: number , weeklyFreq: number) => {
  const totalQuranPages = 604;

  const totalPages = direction === "forward" 
    ? totalQuranPages - currentPage + 1 
    : currentPage;

  const sessionNeeded = Math.ceil(totalPages / pagesPerDay);
  let daysNeeded = 1;
  if (sessionNeeded > 1) {
    daysNeeded = Math.ceil(((sessionNeeded - 1) / weeklyFreq) * 7) + 1;
  }

  const finishDate = new Date();
  if (!isNaN(daysNeeded) && isFinite(daysNeeded)) {
    finishDate.setDate(finishDate.getDate() + (daysNeeded - 1));
  }

  return {
    finishDate: finishDate.toISOString().slice(0, 10),
    daysNeeded
  }

}

export const countPlannedDaysElapsed = (
  startDate: Date,
  today: Date,
  selectedDays: number[]
) => {
  if (selectedDays.length === 0) return 0;
  
  const start = new Date(startDate);
  const end = new Date(today);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const totalDays = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
  const fullWeeks = Math.floor(totalDays / 7);
  const remainingDays = totalDays % 7;

  let plannedDays = fullWeeks * selectedDays.length;
  const startDayOfWeek = (start.getDay() + 6 ) % 7;

  for (let i = 0; i < remainingDays; i++) {
    const currentDay = (startDayOfWeek + i) % 7;
    if (selectedDays.includes(currentDay)) {
      plannedDays++;
    }
  }
  return plannedDays;
};

export const getPerformance = (val: number) => {
  if (val < 0) return { 
    label: "Ahead", color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500", sign: "+", value: val 
  };
  if (val > 0) return { 
    label: "Behind", color: "text-amber-700", bg: "bg-white", dot: "bg-amber-500", sign: "-", value: val 
  };
  return { 
    label: "On Track", color: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-500", sign: "", value: val 
  };
};

export const getLastLog = (hifzPlan: IHifzPlan) => {

  const logs = hifzPlan.hifz_daily_logs || [];
  if (logs.length === 0) return null;

  return logs.reduce<IHifzLog | null>((latest, log) => {
    if (log.status == "missed") return latest;
    if (!latest) return log;

    return new Date(log.date) > new Date(latest.date)
      ? log
      : latest
  }, null)
}