import { create } from "zustand";

type UIMode =
  | "idle"
  | "recitation"
  | "translation"
  | "bookmarking";

type PlayerState =
  | "idle"
  | "downloading"
  | "buffering"
  | "playing"
  | "paused"
  | "error";

type ViewMode = "mushaf" | "translation";

type Ayah = {
  sura: number;
  ayah: number;
};

interface ReaderState {
  selectedAyah: Ayah | null;
  playingAyah: string | null;

  uiMode: UIMode;
  uiVisible: boolean;
  readerActive: boolean;
  playerState: PlayerState;
  viewMode: ViewMode;
  tallyMode: boolean;

  selectedAudio: number;
  selectedTranslations: number[];
  selectedTafsir: number;

  setMode: (mode: UIMode) => void;
  setViewMode: (mode: ViewMode) => void;
  setAudio: (id: number) => void;
  setTranslations: (ids: number[]) => void;
  toggleTranslation: (id: number) => void;
  setTafsir: (id: number) => void;

  setSelectedAyah: (a: Ayah | null) => void;
  setPlayingAyah: (verseKey: string | null) => void;
  setPlayerState: (state: PlayerState) => void;

  resetSelection: () => void;

  showUI: () => void;
  hideUI: () => void;
  toggleUI: () => void;
  toggleTallyMode: () => void;
  setReaderActive: (active: boolean) => void;

  translationSelectorOpen: boolean;
  toggleTranslationSelector: () => void;
  closeTranslationSelector: () => void;
}

export const useReaderStore = create<ReaderState>((set) => ({
  selectedAyah: null,
  playingAyah: null,

  uiMode: "idle",
  uiVisible: false,
  readerActive: false,
  playerState: "idle",
  viewMode: "mushaf",
  tallyMode: false,

  translationSelectorOpen: false,

  selectedAudio: 7,
  selectedTranslations: [85],
  selectedTafsir: 169,

  setSelectedAyah: (a) =>
    set({
      selectedAyah: a,
    }),

  setPlayingAyah: (verseKey) =>
    set({
      playingAyah: verseKey,
    }),

  setPlayerState: (playerState) =>
    set({
      playerState,
    }),

  setMode: (mode) => set({ uiMode: mode }),
  setViewMode: (mode) => set({ viewMode: mode }),

  setAudio: (id) => set({ selectedAudio: id }),

  setTranslations: (ids) => set({ selectedTranslations: ids }),
  toggleTranslation: (id) => set((state) => {
    const ids = state.selectedTranslations.includes(id)
      ? state.selectedTranslations.filter(i => i !== id)
      : [...state.selectedTranslations, id];
    // Keep at least one if preferred, but allow empty if needed
    return { selectedTranslations: ids.length > 0 ? ids : [id] };
  }),
  setTafsir: (id) => set({ selectedTafsir: id }),

  showUI: () => set({ uiVisible: true }),
  hideUI: () => set({ uiVisible: false }),
  toggleUI: () => set((state) => ({ uiVisible: !state.uiVisible })),
  toggleTallyMode: () => set((state) => ({ tallyMode: !state.tallyMode })),
  setReaderActive: (readerActive) => set({ readerActive }),

  toggleTranslationSelector: () => set((s) => ({ translationSelectorOpen: !s.translationSelectorOpen })),
  closeTranslationSelector: () => set({ translationSelectorOpen: false }),

  resetSelection: () =>
    set({
      selectedAyah: null,
      playingAyah: null,
      uiMode: "idle",
      playerState: "idle",
    }),
}));
