import { useCallback, useRef, useState } from "react";
import * as Crypto from "expo-crypto";
import { useSession } from "@/src/hooks/useSession";
import { useBookmarkStore } from "../store/bookmarkStore";
import {
  createRemoteBookmark,
  deleteRemoteBookmark,
  getRawQFErrorMessage,
  listAllRemoteBookmarks,
  parseVerseKey,
} from "../services/bookmarkApi";
import { useQuranStateDb } from "@/src/lib/db/QuranStateDatabaseProvider";
import { useSQLiteContext } from "expo-sqlite";

export const useBookmarks = () => {
  const stateDb = useQuranStateDb();
  const coreDb = useSQLiteContext();
  const { user } = useSession();
  const bookmarks = useBookmarkStore((store) => store.items);
  const setBookmarks = useBookmarkStore((store) => store.setBookmarks);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInFlightRef = useRef(false);

  // --- Helpers ---
  const publishVisibleBookmarks = useCallback(async (userId: string) => {
    const rows = await stateDb.getAllAsync<any>(
      `SELECT local_id as localId, remote_id as remoteId, user_id as userId, 
              verse_key as verseKey, page_number as pageNumber, sync_status as syncStatus, 
              sync_error as syncError, updated_at as updatedAt
       FROM bookmarks_local WHERE user_id = ? AND sync_status != 'deleted'
       ORDER BY updated_at DESC`,
      [userId]
    );
    setBookmarks(rows);
  }, [stateDb, setBookmarks]);

  const upsertBookmarkInStore = useCallback((payload: {
    localId: string;
    remoteId: string | null;
    userId: string;
    verseKey: string;
    pageNumber: number;
    syncStatus: string;
    syncError: string | null;
    updatedAt?: string;
  }) => {
    const updatedAt = payload.updatedAt ?? new Date().toISOString();

    setBookmarks(
      [
        {
          localId: payload.localId,
          remoteId: payload.remoteId,
          userId: payload.userId,
          verseKey: payload.verseKey,
          pageNumber: payload.pageNumber,
          syncStatus: payload.syncStatus,
          syncError: payload.syncError,
          updatedAt,
        },
        ...bookmarks.filter((item) => item.verseKey !== payload.verseKey),
      ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    );
  }, [bookmarks, setBookmarks]);

  const removeBookmarkFromStore = useCallback((verseKey: string) => {
    const normalized = parseVerseKey(verseKey)?.verseKey;
    if (!normalized) return;

    setBookmarks(bookmarks.filter((item) => item.verseKey !== normalized));
  }, [bookmarks, setBookmarks]);

  const getPageFromVerseKey = useCallback(async (verseKey: string) => {
    const parsed = parseVerseKey(verseKey);
    if (!parsed) return 0;
    const row = await coreDb.getFirstAsync<{ page: number }>(
      `SELECT page FROM aya WHERE soraid = ? AND ayaid = ? LIMIT 1`,
      [parsed.sura, parsed.ayah]
    );
    return row?.page ?? 0;
  }, [coreDb]);

  const getFirstVerseKeyFromPage = useCallback(async (pageNumber: number) => {
    const row = await coreDb.getFirstAsync<{ soraid: number; ayaid: number }>(
      `SELECT soraid, ayaid
       FROM aya
       WHERE page = ?
       ORDER BY soraid ASC, ayaid ASC
       LIMIT 1`,
      [pageNumber]
    );

    if (!row?.soraid || !row?.ayaid) {
      return null;
    }

    return `${row.soraid}:${row.ayaid}`;
  }, [coreDb]);

  // --- Background Sync Engine ---
  const syncBookmarks = useCallback(async () => {
    if (!user?.id || syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    setIsSyncing(true);

    try {
      // 1. Handle Pending Additions
      const pending = await stateDb.getAllAsync<any>(
        "SELECT * FROM bookmarks_local WHERE user_id = ? AND sync_status = 'pending'",
        [user.id]
      );
      for (const row of pending) {
        try {
          const remote = await createRemoteBookmark(row.verse_key);
          await stateDb.runAsync(
            "UPDATE bookmarks_local SET remote_id = ?, sync_status = 'synced', sync_error = NULL WHERE local_id = ?",
            [String(remote.id), row.local_id]
          );
        } catch (e) {
          await stateDb.runAsync(
            "UPDATE bookmarks_local SET sync_status = 'failed', sync_error = ? WHERE local_id = ?",
            [getRawQFErrorMessage(e), row.local_id]
          );
        }
      }

      // 2. Handle Pending Deletions
      const toDelete = await stateDb.getAllAsync<any>(
        "SELECT * FROM bookmarks_local WHERE user_id = ? AND sync_status = 'deleted' AND remote_id IS NOT NULL",
        [user.id]
      );
      for (const row of toDelete) {
        try {
          await deleteRemoteBookmark(row.remote_id);
          await stateDb.runAsync("DELETE FROM bookmarks_local WHERE local_id = ?", [row.local_id]);
        } catch (e) {
          if (getRawQFErrorMessage(e).includes("404")) {
            await stateDb.runAsync("DELETE FROM bookmarks_local WHERE local_id = ?", [row.local_id]);
          }
        }
      }

      // 3. Full Reconcile (Silent)
      const remoteItems = await listAllRemoteBookmarks();
      for (const remote of remoteItems) {
        const page = await getPageFromVerseKey(remote.verseKey);
        await stateDb.runAsync(
          `INSERT INTO bookmarks_local (local_id, remote_id, user_id, verse_key, page_number, sync_status)
           VALUES (?, ?, ?, ?, ?, 'synced')
           ON CONFLICT(user_id, verse_key) DO UPDATE SET remote_id = excluded.remote_id, sync_status = 'synced'`,
          [Crypto.randomUUID(), remote.id, user.id, remote.verseKey, page]
        );
      }
      await publishVisibleBookmarks(user.id);
    } catch {
      console.warn("Background Sync encountered an issue, will retry later.");
    } finally {
      syncInFlightRef.current = false;
      setIsSyncing(false);
    }
  }, [user?.id, stateDb, getPageFromVerseKey, publishVisibleBookmarks]);

  const queueSyncBookmarks = useCallback(() => {
    setTimeout(() => {
      void syncBookmarks();
    }, 0);
  }, [syncBookmarks]);

  // --- Public UI Methods ---
  const addBookmarkByVerseKey = useCallback(async (verseKey: string, pageNumber?: number) => {
    if (!user?.id) return;
    const parsed = parseVerseKey(verseKey);
    if (!parsed) return;

    const existing = bookmarks.find((item) => item.verseKey === parsed.verseKey);
    const localId = existing?.localId ?? Crypto.randomUUID();
    const page = pageNumber ?? existing?.pageNumber ?? 0;
    const updatedAt = new Date().toISOString();

    upsertBookmarkInStore({
      localId,
      remoteId: existing?.remoteId ?? null,
      userId: user.id,
      verseKey: parsed.verseKey,
      pageNumber: page,
      syncStatus: "pending",
      syncError: null,
      updatedAt,
    });

    void (async () => {
      const resolvedPage = page > 0 ? page : await getPageFromVerseKey(parsed.verseKey);
      await stateDb.runAsync(
        `INSERT INTO bookmarks_local (local_id, user_id, verse_key, page_number, sync_status, updated_at, deleted_at, sync_error)
         VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, NULL, NULL)
         ON CONFLICT(user_id, verse_key) DO UPDATE SET
           page_number = excluded.page_number,
           sync_status = 'pending',
           deleted_at = NULL,
           sync_error = NULL,
           updated_at = CURRENT_TIMESTAMP`,
        [localId, user.id, parsed.verseKey, resolvedPage]
      );

      if (resolvedPage !== page) {
        upsertBookmarkInStore({
          localId,
          remoteId: existing?.remoteId ?? null,
          userId: user.id,
          verseKey: parsed.verseKey,
          pageNumber: resolvedPage,
          syncStatus: "pending",
          syncError: null,
        });
      }

      queueSyncBookmarks();
    })();
  }, [user?.id, bookmarks, upsertBookmarkInStore, getPageFromVerseKey, stateDb, queueSyncBookmarks]);

  const addBookmark = useCallback(async (pageNumber: number) => {
    if (!user?.id) return;

    const verseKey = await getFirstVerseKeyFromPage(pageNumber);
    if (!verseKey) return;

    await addBookmarkByVerseKey(verseKey, pageNumber);
  }, [addBookmarkByVerseKey, getFirstVerseKeyFromPage, user?.id]);

  const removeBookmarkByVerseKey = useCallback(async (verseKey: string) => {
    if (!user?.id) return;
    const parsed = parseVerseKey(verseKey);
    if (!parsed) return;

    removeBookmarkFromStore(parsed.verseKey);

    void (async () => {
      await stateDb.runAsync(
        "UPDATE bookmarks_local SET sync_status = 'deleted', deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND verse_key = ?",
        [user.id, parsed.verseKey]
      );
      queueSyncBookmarks();
    })();
  }, [user?.id, removeBookmarkFromStore, stateDb, queueSyncBookmarks]);

  const removeBookmark = useCallback(async (pageNumber: number) => {
    if (!user?.id) return;

    const verseKey = await getFirstVerseKeyFromPage(pageNumber);
    if (!verseKey) return;

    await removeBookmarkByVerseKey(verseKey);
  }, [getFirstVerseKeyFromPage, removeBookmarkByVerseKey, user?.id]);

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
