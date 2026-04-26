import { db } from "@/src/lib/db/local-client";
import { bookmarksLocal } from "../database/quranStateSchema";
import { aya } from "../database/quranAssetSchema";
import { eq, and, sql, asc, desc, ne } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import {
  createRemoteBookmark,
  deleteRemoteBookmark,
  getRawQFErrorMessage,
  listAllRemoteBookmarks,
  parseVerseKey,
} from "./bookmarkApi";


export const bookmarkService = {
  

  async getVisibleBookmarks(userId: string) {
    return await db.query.bookmarksLocal.findMany({
      where: and(eq(bookmarksLocal.userId, userId), ne(bookmarksLocal.syncStatus, 'deleted')),
      orderBy: [desc(bookmarksLocal.updatedAt)],
    });
  },


  async getPageFromVerseKey(verseKey: string): Promise<number> {
    const parsed = parseVerseKey(verseKey);
    if (!parsed) return 0;

    const row = await db.query.aya.findFirst({
      where: and(eq(aya.soraid, parsed.sura), eq(aya.ayaid, parsed.ayah)),
      columns: { page: true },
    });

    return row?.page ?? 0;
  },

  async getFirstVerseKeyFromPage(pageNumber: number): Promise<string | null> {
    const row = await db.query.aya.findFirst({
      where: eq(aya.page, pageNumber),
      orderBy: [asc(aya.soraid), asc(aya.ayaid)],
      columns: { soraid: true, ayaid: true },
    });

    return row ? `${row.soraid}:${row.ayaid}` : null;
  },

 
  async upsertBookmark(userId: string, verseKey: string, pageNumber: number, localId?: string) {
    const id = localId || Crypto.randomUUID();
    
    await db.insert(bookmarksLocal)
      .values({
        localId: id,
        userId,
        verseKey,
        pageNumber,
        syncStatus: 'pending',
      })
      .onConflictDoUpdate({
        target: [bookmarksLocal.userId, bookmarksLocal.verseKey],
        set: {
          pageNumber,
          syncStatus: 'pending',
          deletedAt: null,
          syncError: null,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        }
      });
      
    return id;
  },

 
  async markAsDeleted(userId: string, verseKey: string) {
    await db.update(bookmarksLocal)
      .set({ 
        syncStatus: 'deleted', 
        deletedAt: sql`CURRENT_TIMESTAMP`, 
        updatedAt: sql`CURRENT_TIMESTAMP` 
      })
      .where(and(eq(bookmarksLocal.userId, userId), eq(bookmarksLocal.verseKey, verseKey)));
  },


  async sync(userId: string) {
    try {
      const pending = await db.query.bookmarksLocal.findMany({
        where: and(eq(bookmarksLocal.userId, userId), eq(bookmarksLocal.syncStatus, 'pending')),
      });

      for (const row of pending) {
        try {
          const remote = await createRemoteBookmark(row.verseKey);
          await db.update(bookmarksLocal)
            .set({ remoteId: String(remote.id), syncStatus: 'synced', syncError: null })
            .where(eq(bookmarksLocal.localId, row.localId));
        } catch (e) {
          await db.update(bookmarksLocal)
            .set({ syncStatus: 'failed', syncError: getRawQFErrorMessage(e) })
            .where(eq(bookmarksLocal.localId, row.localId));
        }
      }

      const toDelete = await db.query.bookmarksLocal.findMany({
        where: and(
          eq(bookmarksLocal.userId, userId), 
          eq(bookmarksLocal.syncStatus, 'deleted'),
          sql`${bookmarksLocal.remoteId} IS NOT NULL`
        ),
      });

      for (const row of toDelete) {
        try {
          if (row.remoteId) {
            await deleteRemoteBookmark(row.remoteId);
          }
          await db.delete(bookmarksLocal).where(eq(bookmarksLocal.localId, row.localId));
        } catch (e) {
          if (getRawQFErrorMessage(e).includes("404")) {
            await db.delete(bookmarksLocal).where(eq(bookmarksLocal.localId, row.localId));
          }
        }
      }

      const remoteItems = await listAllRemoteBookmarks();
      for (const remote of remoteItems) {
        const page = await this.getPageFromVerseKey(remote.verseKey);
        await db.insert(bookmarksLocal)
          .values({
            localId: Crypto.randomUUID(),
            remoteId: String(remote.id),
            userId,
            verseKey: remote.verseKey,
            pageNumber: page,
            syncStatus: 'synced',
          })
          .onConflictDoUpdate({
            target: [bookmarksLocal.userId, bookmarksLocal.verseKey],
            set: { remoteId: String(remote.id), syncStatus: 'synced' }
          });
      }
    } catch (error) {
      console.warn("Bookmark sync encountered an issue:", error);
    }
  }
};
