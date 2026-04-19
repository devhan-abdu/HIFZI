import { ISurah } from "@/src/types";
import { getJuzByPage, getSurah } from "../../muraja/utils/quranMapping";
import { IHifzLog, IHifzPlan } from "../types";

export const getNextTask = (
  direction: "backward" | "forward",
  lastLoggedPage: number,
  dailyRate: number,
  surahData: ISurah[],
  isNewPlan: boolean
) => {
  const isForward = direction === 'forward';
  let pageAllocated = 0;
  let startPage: number | null = null;
  let endPage: number | null = null;

  let currentPage = isNewPlan ? lastLoggedPage : 0;

  if (!isNewPlan) {
    const currentSurah = getSurah(lastLoggedPage, surahData);
    if (!currentSurah) return null;

    if (isForward) {
      currentPage = lastLoggedPage + 1;
    } else {
      currentPage = (lastLoggedPage >= currentSurah.endingPage)
        ? (surahData.find(s => s.number === currentSurah.number - 1)?.startingPage || 1)
        : lastLoggedPage + 1;
    }
  }

  while (pageAllocated < dailyRate) {
    if (currentPage > 604 || currentPage < 1) break;

    if (startPage === null) startPage = currentPage;
    endPage = currentPage;
    pageAllocated++;

    const currentSurah = getSurah(currentPage, surahData);
    if (!currentSurah) break;

    if (isForward) {
      currentPage++;
    } else {
      if (currentPage >= currentSurah.endingPage) {
        const prevSurah = surahData.find(s => s.number === currentSurah.number - 1);
        if (!prevSurah) break;
        currentPage = prevSurah.startingPage;
      } else {
        currentPage++;
      }
    }
  }

  if (startPage === null || endPage === null) return null;

  const sSurah = getSurah(startPage, surahData);
  const eSurah = getSurah(endPage, surahData);

  return {
    startPage,
    endPage,
    startSurah: sSurah?.englishName,
    endSurah: eSurah?.englishName,
    displaySurah: sSurah?.number === eSurah?.number
      ? sSurah?.englishName
      : `${sSurah?.englishName} & ${eSurah?.englishName}`,
    juz: getJuzByPage(endPage),
    target: dailyRate,
    status: "pending",
  };
};

export const getTodayTask = (
  hifzPlan: IHifzPlan,
  surahData: ISurah[],
  pages: number = hifzPlan.pages_per_day,
  
) => {
  const todayStr = new Date().toISOString().slice(0, 10);


  const historicalLogs = (hifzPlan.hifz_daily_logs || [])
    .filter(log => log.date < todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  
  const lastLog = [...historicalLogs].reverse().find(log => log.status === "completed" || log.status === "partial")

  const reaferencePage = lastLog ? lastLog.actual_end_page : hifzPlan.start_page;

  return getNextTask(
    hifzPlan.direction as "forward" | "backward",
    reaferencePage,
    pages,
    surahData,
    historicalLogs.length === 0,
  );
}


export const getPagesFromLog = (log: IHifzLog, direction: 'forward' | 'backward' , surahData: ISurah[]): number[] => {
  const pages: number[] = [];
  const start = log.actual_start_page;
  const end = log.actual_end_page;
  let page = start

  if (direction === 'forward') {
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
  } else {
    while (page !== end) {
      pages.push(start)
     const currentSurah = getSurah(page, surahData);
      if (!currentSurah) break;
      
      if (page >= currentSurah.endingPage) {
        const prevSurah = surahData.find(s => s.number === currentSurah.number - 1);
        if (!prevSurah) break;
        page = prevSurah.startingPage;
      } else {
        page++
      }
    }

    pages.push(page)
 
  }
  return pages;
};
