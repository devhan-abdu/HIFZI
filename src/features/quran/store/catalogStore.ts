import { create } from "zustand";

import { type JuzSection, type Surah } from "../type";
import { type ISurah } from "@/src/types";

type CatalogStatus = "idle" | "loading" | "ready" | "error";

interface CatalogStoreState {
  status: CatalogStatus;
  error: string | null;
  surahs: ISurah[];
  juzSections: JuzSection[];
  displaySections: Array<{
    title: string;
    juzNumber: number;
    juzStartingPage: number;
    data: Surah[];
  }>;
  hydratedAt: number | null;
  startHydration: () => void;
  setCatalog: (payload: { surahs: ISurah[]; juzSections: JuzSection[] }) => void;
  setError: (message: string) => void;
}

function buildDisplaySections(juzSections: JuzSection[]) {
  const renderedSurahs = new Set<number>();

  return juzSections.map((juz) => {
    const data = juz.surahs.filter((surah) => {
      if (renderedSurahs.has(surah.number)) {
        return false;
      }

      renderedSurahs.add(surah.number);
      return true;
    });

    return {
      title: `Juz' ${juz.juzNumber}`,
      juzNumber: juz.juzNumber,
      juzStartingPage: data[0]?.startingPage ?? juz.surahs[0]?.startingPage ?? 0,
      data,
    };
  });
}

export const useCatalogStore = create<CatalogStoreState>((set) => ({
  status: "idle",
  error: null,
  surahs: [],
  juzSections: [],
  displaySections: [],
  hydratedAt: null,
  startHydration: () => set({ status: "loading", error: null }),
  setCatalog: ({ surahs, juzSections }) =>
    set({
      surahs,
      juzSections,
      displaySections: buildDisplaySections(juzSections),
      status: "ready",
      error: null,
      hydratedAt: Date.now(),
    }),
  setError: (message) =>
    set({
      status: "error",
      error: message,
    }),
}));
