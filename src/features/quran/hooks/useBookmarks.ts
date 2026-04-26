import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/src/hooks/useSession";
import { useBookmarkStore } from "../store/bookmarkStore";
import { parseVerseKey } from "../services/bookmarkApi";
import { bookmarkService } from "../services/bookmarkService";

export const useBookmarks = () => {
  const { user } = useSession();
  
  const bookmarks = useBookmarkStore((store) => store.items);
  const setBookmarks = useBookmarkStore((store) => store.setBookmarks);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInFlightRef = useRef(false);

  useEffect(() => {
    if (user?.id) {
      void syncBookmarks();
    }
  }, [user?.id]);

  const publishVisibleBookmarks = useCallback(async (userId: string) => {
    const rows = await bookmarkService.getVisibleBookmarks(userId);
    setBookmarks(rows as any);
  }, [setBookmarks]);


  const syncBookmarks = useCallback(async () => {
    if (!user?.id || syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    setIsSyncing(true);

    try {
      await bookmarkService.sync(user.id);
      await publishVisibleBookmarks(user.id);
    } finally {
      syncInFlightRef.current = false;
      setIsSyncing(false);
    }
  }, [user?.id, publishVisibleBookmarks]);

 
  const queueSyncBookmarks = useCallback(() => {
    setTimeout(() => void syncBookmarks(), 0);
  }, [syncBookmarks]);


  const addBookmarkByVerseKey = useCallback(async (verseKey: string, pageNumber?: number) => {
    if (!user?.id) return;
    const parsed = parseVerseKey(verseKey);
    if (!parsed) return;

    const existing = bookmarks.find((item) => item.verseKey === parsed.verseKey);
    const resolvedPage = pageNumber ?? (await bookmarkService.getPageFromVerseKey(parsed.verseKey));

    await bookmarkService.upsertBookmark(user.id, parsed.verseKey, resolvedPage, existing?.localId);
    await publishVisibleBookmarks(user.id);
    queueSyncBookmarks();
  }, [user?.id, bookmarks, publishVisibleBookmarks, queueSyncBookmarks]);

  const addBookmark = useCallback(async (pageNumber: number) => {
    if (!user?.id) return;
    const verseKey = await bookmarkService.getFirstVerseKeyFromPage(pageNumber);
    if (verseKey) await addBookmarkByVerseKey(verseKey, pageNumber);
  }, [addBookmarkByVerseKey, user?.id]);

  const removeBookmarkByVerseKey = useCallback(async (verseKey: string) => {
    if (!user?.id) return;
    const parsed = parseVerseKey(verseKey);
    if (!parsed) return;

    await bookmarkService.markAsDeleted(user.id, parsed.verseKey);
    await publishVisibleBookmarks(user.id);
    queueSyncBookmarks();
  }, [user?.id, publishVisibleBookmarks, queueSyncBookmarks]);

  const removeBookmark = useCallback(async (pageNumber: number) => {
    if (!user?.id) return;
    const verseKey = await bookmarkService.getFirstVerseKeyFromPage(pageNumber);
    if (verseKey) await removeBookmarkByVerseKey(verseKey);
  }, [removeBookmarkByVerseKey, user?.id]);

  return {
    bookmarks,
    isSyncing,
    addBookmark,
    addBookmarkByVerseKey,
    removeBookmark,
    removeBookmarkByVerseKey,
    isBookmarked: (vk: string) => bookmarks.some(b => b.verseKey === parseVerseKey(vk)?.verseKey),
    isPageBookmarked: (p: number) => bookmarks.some(b => b.pageNumber === p),
    syncBookmarks
  };
};
