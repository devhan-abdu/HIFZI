import { create } from "zustand";

export type BookmarkRecord = {
  localId: string;
  remoteId: string | null;
  userId: string;
  verseKey: string;
  pageNumber: number;
  syncStatus: string;
  syncError: string | null;
  updatedAt: string;
};

interface BookmarkStoreState {
  hydrated: boolean;
  items: BookmarkRecord[];
  setBookmarks: (items: BookmarkRecord[]) => void;
}

export const useBookmarkStore = create<BookmarkStoreState>((set) => ({
  hydrated: false,
  items: [],
  setBookmarks: (items) =>
    set({
      hydrated: true,
      items,
    }),
}));
