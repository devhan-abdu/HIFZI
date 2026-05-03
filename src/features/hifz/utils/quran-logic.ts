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


export const getPagesFromLog = (log: IHifzLog, direction: 'forward' | 'backward', surahData: ISurah[]): number[] => {
  const pages: number[] = [];
  let currentPage = log.actual_start_page;
  const targetCount = log.actual_pages_completed || 0;

  if (targetCount === 0 && log.status !== "missed") {
    return [log.actual_start_page];
  }

  while (pages.length < targetCount) {
    if (currentPage > 604 || currentPage < 1) break;
    pages.push(currentPage);

    if (pages.length >= targetCount) break;

    const currentSurah = getSurah(currentPage, surahData);
    if (!currentSurah) break;

    if (direction === 'forward') {
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

  return [...new Set(pages)].filter(p => p >= 1 && p <= 604);
};

export const getReinforcementRange = (
  hifzPlan: IHifzPlan,
  surahData: ISurah[],
  count: number = 5
) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  
  const logs = (hifzPlan.hifz_daily_logs || [])
    .filter(log => log.date < todayStr && (log.status === "completed" || log.status === "partial"))
    .sort((a, b) => b.date.localeCompare(a.date));

  if (logs.length === 0) return null;

  const pages: number[] = [];
  for (const log of logs) {
    const logPages = getPagesFromLog(log, hifzPlan.direction, surahData);
    for (let i = logPages.length - 1; i >= 0; i--) {
      if (!pages.includes(logPages[i])) {
        pages.push(logPages[i]);
      }
        if (pages.length >= count) break;
    }
    if (pages.length >= count) break;
  }

  if (pages.length === 0) return null;

  const startPage = hifzPlan.direction === 'forward' ? Math.min(...pages) : Math.max(...pages);
  const endPage = hifzPlan.direction === 'forward' ? Math.max(...pages) : Math.min(...pages);
  
  const sSurah = getSurah(startPage, surahData);
  const eSurah = getSurah(endPage, surahData);

  return {
    startPage,
    endPage,
    startSurah: sSurah?.englishName,
    endSurah: eSurah?.englishName,
    pagesCount: pages.length,
    displaySurah: sSurah?.number === eSurah?.number
      ? sSurah?.englishName
      : hifzPlan.direction === 'forward' 
        ? `${sSurah?.englishName} - ${eSurah?.englishName}`
        : `${eSurah?.englishName} - ${sSurah?.englishName}`,
  };
};
