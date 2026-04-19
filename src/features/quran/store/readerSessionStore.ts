import { create } from "zustand";

type ReaderMode = "mushaf" | "translation";

interface ReaderSessionState {
  currentPage: number;
  mode: ReaderMode;
  selectedTranslationId: number | null;
  selectedReciterId: number | null;
  preloadPages: number[];
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
  openSession: (page) =>
    set({
      currentPage: page,
      preloadPages: buildPreloadPages(page),
    }),
  setMode: (mode) => set({ mode }),
  setSelectedTranslationId: (selectedTranslationId) => set({ selectedTranslationId }),
  setSelectedReciterId: (selectedReciterId) => set({ selectedReciterId }),
}));
