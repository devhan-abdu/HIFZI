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
  sessionStartTime: number | null;
  pagesViewed: number[];
  updateTally: (counts: { mistakes: number; hesitations: number }) => void;
  resetTally: () => void;
  openSession: (page: number) => void;
  setPage: (page: number) => void;
  setMode: (mode: ReaderMode) => void;
  setSelectedTranslationId: (translationId: number | null) => void;
  setSelectedReciterId: (reciterId: number | null) => void;
  getDurationMinutes: () => number;
}

function buildPreloadPages(page: number) {
  return [page - 1, page, page + 1].filter((value) => value >= 1 && value <= 604);
}

export const useReaderSessionStore = create<ReaderSessionState>((set, get) => ({
  currentPage: 1,
  mode: "mushaf",
  selectedTranslationId: null,
  selectedReciterId: null,
  preloadPages: buildPreloadPages(1),
  mistakes: 0,
  hesitations: 0,
  sessionStartTime: null,
  pagesViewed: [],
  updateTally: (counts) => set({ mistakes: counts.mistakes, hesitations: counts.hesitations }),
  resetTally: () => set({ mistakes: 0, hesitations: 0 }),
  openSession: (page) =>
    set({
      currentPage: page,
      preloadPages: buildPreloadPages(page),
      mistakes: 0,
      hesitations: 0,
      sessionStartTime: Date.now(),
      pagesViewed: [page],
    }),
  setPage: (page) => 
    set((state) => ({
      currentPage: page,
      preloadPages: buildPreloadPages(page),
      pagesViewed: state.pagesViewed.includes(page) ? state.pagesViewed : [...state.pagesViewed, page]
    })),
  setMode: (mode) => set({ mode }),
  setSelectedTranslationId: (selectedTranslationId) => set({ selectedTranslationId }),
  setSelectedReciterId: (selectedReciterId) => set({ selectedReciterId }),
  getDurationMinutes: () => {
    const start = get().sessionStartTime;
    if (!start) return 0;
    const diffMs = Date.now() - start;
    return Math.max(1, Math.round(diffMs / 60000));
  },
}));
