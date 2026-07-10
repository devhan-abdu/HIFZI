import { ISurah } from "@/src/types";
import { WeeklyMurajaFormType } from "../types";

export const calculateMurajaPlanStats = (data: Partial<WeeklyMurajaFormType>, surahData?: ISurah[]) => {
  const startPage = Number(data.start_page) || 1;
  const endPage = Number(data.end_page) || 604;
  const dailyRate = Number(data.planned_pages_per_day) || 20;
  const weeklyFreq = data.selectedDays?.length || 1;

  const totalPages = Math.max(1, endPage - startPage + 1);
  const sessionNeeded = Math.ceil(totalPages / dailyRate);
  let daysNeeded = 1;
  if (sessionNeeded > 1) {
    daysNeeded = Math.ceil(((sessionNeeded - 1) / weeklyFreq) * 7) + 1;
  }

  const finishDate = new Date(data.week_start_date || new Date());
  if (!isNaN(daysNeeded) && isFinite(daysNeeded)) {
    finishDate.setDate(finishDate.getDate() + (daysNeeded - 1));
  }

  return {
    totalPages,
    finishDate,
    daysNeeded,
  };
};

export const calculateMurajaFinishedDate = (
    remainingPages: number, 
    pagesPerDay: number, 
    weeklyFreq: number,
) => {
  const sessionNeeded = Math.ceil(remainingPages / Math.max(1, pagesPerDay));
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
