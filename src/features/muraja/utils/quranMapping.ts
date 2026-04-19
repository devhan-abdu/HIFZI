import { ISurah } from "@/src/types";

export const fullDayNames: Record<string, string> = {
    Sun: "Sunday",
    Mon: "Monday",
    Tue: "Tuesday",
    Wed: "Wednesday",
    Thu: "Thursday",
    Fri: "Friday",
    Sat: "Saturday",
};

export const DAY_MAP: Record<string, string> = {
  "Monday": "Mon", "Tuesday": "Tue", "Wednesday": "Wed", "Thursday": "Thu",
  "Friday": "Fri", "Saturday": "Sat", "Sunday": "Sun"
};
export const DAY_NUMBER_MAP: Record<string, number> = {
  "Monday": 1, "Tuesday":2 ,"Wednesday": 3, "Thursday": 4,
  "Friday": 5, "Saturday": 6, "Sunday": 0
};
  
const juzStartPages = [
  1, 22, 42, 62, 82, 102, 122, 142, 162, 182,
  202, 222, 242, 262, 282, 302, 322, 342, 362, 382,
  402, 422, 442, 462, 482, 502, 522, 542, 562, 582, 604
];


export function getJuzByPage(page: number) {
  for (let i = juzStartPages.length - 1; i >= 0; i--) {
    if (page >= juzStartPages[i]) return i + 1;
  }
}

export function getSurahByPage(page: number, surah: ISurah[]) {
     return surah.find(s => page >=s.startingPage && page <= s.endingPage)?.englishName
}
export function getSurahNameByNumber(surahNumber: number, surah: ISurah[]) {
     return surah.find(s => s.number === surahNumber)?.englishName
}
export function getSurah(page: number, surah: ISurah[]) {
        return surah.find(s => page >=s.startingPage && page <= s.endingPage)
}

export function getWeeklyPlanData(startPage: number , plannedPages: number, selectedDaysLength: number, surah: ISurah[]) {
  const endPage = startPage + plannedPages * selectedDaysLength - 1
  const startSurah = getSurahByPage(startPage, surah)
  const endSurah = getSurahByPage(endPage, surah)
  const startJuz = getJuzByPage(startPage)
  const endJuz = getJuzByPage(endPage)

  return {  startSurah,endPage, endSurah, startJuz, endJuz}
}




