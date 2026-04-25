import { create } from "zustand";

type ReaderMode = "mushaf" | "translation";

interface ReaderSessionState {
  currentPage: number;
  mode: ReaderMode;
  selectedTranslationId: number | null;
  selectedReciterId: number | null;
  preloadPages: number[];
  mistakes: number;
  hesitations: number;
  updateTally: (counts: { mistakes: number; hesitations: number }) => void;
  resetTally: () => void;
  openSession: (page: number) => void;
  setMode: (mode: ReaderMode) => void;
  setSelectedTranslationId: (translationId: number | null) => void;
  setSelectedReciterId: (reciterId: number | null) => void;
}

function buildPreloadPages(page: number) {
  return [page - 1, page, page + 1].filter((value) => value >= 1 && value <= 604);
}

export const useReaderSessionStore = create<ReaderSessionState>((set) => ({
  currentPage: 1,
  mode: "mushaf",
  selectedTranslationId: null,
  selectedReciterId: null,
  preloadPages: buildPreloadPages(1),
  mistakes: 0,
  hesitations: 0,
  updateTally: (counts) => set({ mistakes: counts.mistakes, hesitations: counts.hesitations }),
  resetTally: () => set({ mistakes: 0, hesitations: 0 }),
  openSession: (page) =>
    set({
      currentPage: page,
      preloadPages: buildPreloadPages(page),
      mistakes: 0,
      hesitations: 0,
    }),
  setMode: (mode) => set({ mode }),
  setSelectedTranslationId: (selectedTranslationId) => set({ selectedTranslationId }),
  setSelectedReciterId: (selectedReciterId) => set({ selectedReciterId }),
}));
