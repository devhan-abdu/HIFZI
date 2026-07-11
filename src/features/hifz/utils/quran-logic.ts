import { ISurah } from "@/src/types";
import { getJuzByPage ,getSurahForTraversal} from "../../muraja/utils/quranMapping";
import { IHifzLog, IHifzPlan } from "../types";


export const getNextTask = (
  direction: "backward" | "forward",
  lastLoggedPage: number,
  dailyRate: number,
  surahData: ISurah[],
  isNewPlan: boolean
) => {
  if (dailyRate <= 0) return null;
  const isForward = direction === 'forward';

  let pageAllocated = 0;
  let startPage: number | null = null;
  let endPage: number | null = null;
  let startSurahNumber: number | null = null;
  let endSurahNumber: number | null = null;
  let currentPage = isNewPlan ? lastLoggedPage : 0;
  let currentSurahNumber: number | null = null;

  if (!isNewPlan) {
    const currentSurah = getSurahForTraversal(lastLoggedPage, surahData);
    if (!currentSurah) return null;

    if (isForward) {
      currentPage = lastLoggedPage + 1;
    } else {
      if (lastLoggedPage >= currentSurah.endingPage) {
        const prevSurah = surahData.find(s => s.number === currentSurah.number - 1);
        if (!prevSurah) return null;
        currentPage = prevSurah.startingPage;
        currentSurahNumber = prevSurah.number;
      } else {
        currentPage = lastLoggedPage + 1;
        currentSurahNumber = currentSurah.number;
      }
    }
  }

  while (pageAllocated < dailyRate) {
    if (currentPage > 604 || currentPage < 1) break;

    if (currentSurahNumber === null) {
      const s = getSurahForTraversal(currentPage, surahData);
      if (!s) break;
      currentSurahNumber = s.number;
    }

    const currentSurah = surahData.find(s => s.number === currentSurahNumber);
    if (!currentSurah) break;

    if (startPage === null) {
      startPage = currentPage;
      startSurahNumber = currentSurah.number;
    }
    endPage = currentPage;
    endSurahNumber = currentSurah.number;
    pageAllocated++;

    if (isForward) {
      currentPage++;
      if (currentPage > currentSurah.endingPage) {
        currentSurahNumber = currentSurah.number + 1; // deterministic, no re-lookup
      }
    } else {
      if (currentPage >= currentSurah.endingPage) {
        const prevSurah = surahData.find(s => s.number === currentSurah.number - 1);
        if (!prevSurah) break;
        currentPage = prevSurah.startingPage;
        currentSurahNumber = prevSurah.number; // explicit, no re-lookup
      } else {
        currentPage++;
      }
    }
  }

  if (startPage === null || endPage === null) return null;

  const sSurah = surahData.find(s => s.number === startSurahNumber);
  const eSurah = surahData.find(s => s.number === endSurahNumber);

  return {
    startPage,
    endPage,
    startSurah: sSurah?.englishName,
    endSurah: eSurah?.englishName,
    displaySurah: sSurah?.number === eSurah?.number
      ? sSurah?.englishName
      : `${sSurah?.englishName} & ${eSurah?.englishName}`,
    juz: getJuzByPage(endPage),
    target: pageAllocated,
    status: "pending",
  };
};
export const getTodayTask = (
  hifzPlan: IHifzPlan,
  surahData: ISurah[],
  pages: number = hifzPlan.pagesPerDay,
) => {
  if (pages <= 0) return null;

  const todayStr = new Date().toISOString().slice(0, 10);

  const historicalLogs = (hifzPlan.hifzDailyLogs || [])
    .filter(log => log.date < todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  
  const lastLog = [...historicalLogs].reverse().find(log => log.status === "completed" || log.status === "partial")

  const reaferencePage = lastLog ? lastLog.actualEndPage : hifzPlan.startPage;
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
  let currentPage = log.actualStartPage;
  const targetCount = log.actualPagesCompleted || 0;

  if (targetCount === 0 && log.status !== "missed") {
    return [log.actualStartPage];
  }

  while (pages.length < targetCount) {
    if (currentPage > 604 || currentPage < 1) break;
    pages.push(currentPage);

    if (pages.length >= targetCount) break;

    const currentSurah = getSurahForTraversal(currentPage, surahData);
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
  
  const logs = (hifzPlan.hifzDailyLogs || [])
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

  const actualPages = [...pages].reverse();
  const startPage = actualPages[0];
  const endPage = actualPages[actualPages.length - 1];
  
  const sSurah = getSurahForTraversal(startPage, surahData);
  const eSurah = getSurahForTraversal(endPage, surahData);

  return {
    startPage,
    endPage,
    actualPages,
    startSurah: sSurah?.englishName,
    endSurah: eSurah?.englishName,
    pagesCount: actualPages.length,
    displaySurah: sSurah?.number === eSurah?.number
      ? sSurah?.englishName
      : `${sSurah?.englishName} – ${eSurah?.englishName}`,
  };
};
