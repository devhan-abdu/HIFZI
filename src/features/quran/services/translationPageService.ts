import { Directory, File, Paths } from "expo-file-system";
import { db } from "@/src/lib/db/local-client";
import { eq } from "drizzle-orm";
import { translationResources } from "../database/quranStateSchema";
import { callQF, QF_ENV, QFRequestError } from "./qfClient";
import { getTranslationsCached, Translation } from "./quranContentService";

// ─── Types ──────────────────────────────────────────────────────────────────

export type VerseTranslationEntry = {
  verseKey: string;   // e.g. "2:255"
  verseNumber: number;
  arabicText: string;
  translations: {
    id: number;
    text: string;
  }[];
};

export type DownloadedTranslation = Translation & {
  downloaded: boolean;
  downloadProgress: number; // 0-1
};

// ─── Constants & Paths ───────────────────────────────────────────────────────

const CACHE_ROOT = new Directory(Paths.document, "quran_pages_cache");
const ARABIC_DIR = new Directory(CACHE_ROOT, "arabic");
const TRANSLATION_DIR = new Directory(CACHE_ROOT, "translations");

// Track active downloads in memory to prevent duplicate requests and provide UI feedback
const activeDownloads = new Set<number>();

function getArabicFile(page: number) {
  return new File(ARABIC_DIR, `page_${page}.json`);
}

function getTranslationFile(translationId: number, page: number) {
  const dir = new Directory(TRANSLATION_DIR, String(translationId));
  return new File(dir, `page_${page}.json`);
}

// ─── In-memory LRU Cache ─────────────────────────────────────────────────────

const MAX_MEMORY_PAGES = 60;
const memoryArabicCache = new Map<number, { verse_key: string; text_uthmani: string }[]>();
const memoryTranslationCache = new Map<string, { verse_key?: string; text: string }[]>();

function memKey(translationId: number, page: number) {
  return `${translationId}:${page}`;
}

function lruSet<K, V>(cache: Map<K, V>, key: K, value: V) {
  if (cache.size >= MAX_MEMORY_PAGES) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, value);
}

// ─── Arabic Page Fetching ────────────────────────────────────────────────────

async function fetchArabicPage(page: number): Promise<{ verse_key: string; text_uthmani: string }[]> {
  const mem = memoryArabicCache.get(page);
  if (mem && mem.length > 0) return mem;

  const cacheFile = getArabicFile(page);
  if (cacheFile.exists) {
    try {
      const parsed = JSON.parse(cacheFile.textSync());
      if (Array.isArray(parsed) && parsed.length > 0) {
        lruSet(memoryArabicCache, page, parsed);
        return parsed;
      }
    } catch (e) {
      // Ignore parse errors from stale cache
    }
  }

  const endpoint = `/${QF_ENV}/content/api/v4/verses/by_page/${page}`;
  
  try {
    const response = await callQF(endpoint, {
      params: { 
        words: false, 
        fields: "text_uthmani",
        mushaf: 2, // mushaf: 2 = Hafs (standard). BOOKMARKS_MUSHAF_ID = 4 is separate (reading position tracker).
        per_page: 50 // ensure all verses on page are fetched
      },
      silentErrorLog: true,
    });

    const verses: { verse_key: string; text_uthmani: string }[] = (response?.verses ?? []).map((v: any) => ({
      verse_key: v.verse_key ?? "",
      text_uthmani: v.text_uthmani ?? v.text_indopak ?? v.text_simple ?? "",
    }));

    if (verses.length === 0) {
      throw new Error(`Arabic content not found for page ${page}`);
    }

    if (!ARABIC_DIR.exists) ARABIC_DIR.create({ idempotent: true, intermediates: true });
    cacheFile.write(JSON.stringify(verses));
    lruSet(memoryArabicCache, page, verses);

    return verses;
  } catch (e) {
    if (e instanceof QFRequestError && e.status === 404) {
      throw new Error(`Page ${page} not found in Arabic Mushaf.`);
    }
    throw e;
  }
}

// ─── Translation Page Fetching ───────────────────────────────────────────────

async function fetchTranslationPage(
  translationId: number,
  page: number,
): Promise<{ verse_key?: string; text: string }[]> {
  const key = memKey(translationId, page);

  const mem = memoryTranslationCache.get(key);
  if (mem && mem.length > 0) return mem;

  const cacheFile = getTranslationFile(translationId, page);
  if (cacheFile.exists) {
    try {
      const parsed = JSON.parse(cacheFile.textSync());
      if (Array.isArray(parsed) && parsed.length > 0) {
        lruSet(memoryTranslationCache, key, parsed);
        return parsed;
      }
    } catch (e) {
      // Ignore parse errors from stale cache
    }
  }

  const endpoint = `/${QF_ENV}/content/api/v4/translations/${translationId}/by_page/${page}`;
  
  try {
    const response = await callQF(endpoint, { 
      params: { 
        mushaf: 2,
        per_page: 50 // ensure all translations on page are fetched
      },
      silentErrorLog: true 
    });

    const translations: { verse_key?: string; text: string }[] = (response?.translations ?? []).map((t: any) => ({
      verse_key: t.verse_key, // might be undefined in this endpoint
      text: (t.text ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(),
    }));

    if (translations.length > 0) {
      const dir = new Directory(TRANSLATION_DIR, String(translationId));
      if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
      cacheFile.write(JSON.stringify(translations));
      lruSet(memoryTranslationCache, key, translations);
    }

    return translations;
  } catch (e) {
    if (e instanceof QFRequestError && e.status === 404) {
      return [];
    }
    throw e;
  }
}

// ─── Public: Load merged page ────────────────────────────────────────────────

export async function loadTranslationPage(
  page: number,
  translationIds: number[],
): Promise<VerseTranslationEntry[]> {
  try {
    const [arabicVerses, ...allTranslations] = await Promise.all([
      fetchArabicPage(page),
      ...translationIds.map(tid => fetchTranslationPage(tid, page).catch(() => [])),
    ]);

    const translationData = translationIds.map((tid, index) => {
      const transArray = allTranslations[index] ?? [];
      return {
        id: tid,
        array: transArray,
        // Also build a map if verse_key IS available (for robustness)
        map: new Map(transArray.filter(t => !!t.verse_key).map(t => [t.verse_key!, t.text])),
      };
    });

    return arabicVerses.map((v, verseIndex) => {
      const [, ayahStr] = v.verse_key.split(":");
      return {
        verseKey: v.verse_key,
        verseNumber: Number(ayahStr) || 0,
        arabicText: v.text_uthmani,
        translations: translationData.map(td => {
          // 1. Try Map by verse_key
          let text = td.map.get(v.verse_key);
          // 2. Fallback to index-based mapping (very common for by_page endpoints)
          if (text === undefined) {
            text = td.array[verseIndex]?.text ?? "";
          }
          return { id: td.id, text };
        }),
      };
    });
  } catch (e) {
    throw e;
  }
}

export function prefetchTranslationPages(page: number, translationIds: number[]) {
  const pages = [page - 1, page, page + 1, page + 2, page + 3].filter((p) => p >= 1 && p <= 604);
  pages.forEach((p) => {
    loadTranslationPage(p, translationIds).catch(() => null);
  });
}

export function warmTranslationPage(page: number, translationIds: number[]) {
  const start = Math.max(1, page - 3);
  const end = Math.min(604, page + 3);
  for (let p = start; p <= end; p++) {
    loadTranslationPage(p, translationIds).catch(() => null);
  }
}

// ─── Translation Manager: List & Download ────────────────────────────────────

export async function getTranslationsWithDownloadStatus(): Promise<DownloadedTranslation[]> {
  const [allTranslations, localResources] = await Promise.all([
    getTranslationsCached(),
    db.select().from(translationResources),
  ]);

  const localMap = new Map(localResources.map((r) => [r.translationId, r]));

  return allTranslations.map((t) => {
    const local = localMap.get(t.id);
    return {
      ...t,
      downloaded: (local?.downloadProgress ?? 0) >= 0.999,
      downloadProgress: local?.downloadProgress ?? 0,
    };
  });
}

export async function downloadTranslation(
  id: number,
  name: string,
  onProgress: (p: number) => void,
) {
  if (activeDownloads.has(id)) return;
  activeDownloads.add(id);

  console.log(`[TranslationService] Starting download for ${name} (${id})...`);

  try {
    // 1. Count how many pages are already downloaded
    let completedCount = 0;
    for (let p = 1; p <= 604; p++) {
      if (getTranslationFile(id, p).exists) {
        completedCount++;
      }
    }
    const initialProgress = completedCount / 604;

    await db.insert(translationResources)
      .values({
        translationId: id,
        name,
        totalPages: 604,
        downloadProgress: initialProgress,
      })
      .onConflictDoUpdate({
        target: translationResources.translationId,
        set: { updatedAt: new Date().toISOString() }
      });

    onProgress(initialProgress);

    const chunkSize = 5; // Production level: smaller chunks to avoid rate limits and network congestion
    for (let i = 1; i <= 604; i += chunkSize) {
      const end = Math.min(i + chunkSize - 1, 604);
      const pagesToDownload: number[] = [];

      for (let p = i; p <= end; p++) {
        if (getTranslationFile(id, p).exists) {
          // already counted / exists, skip
        } else {
          pagesToDownload.push(p);
        }
      }

      if (pagesToDownload.length > 0) {
        // Fetch pages in parallel within the chunk
        await Promise.all(pagesToDownload.map((p) => fetchTranslationPage(id, p)));
        completedCount += pagesToDownload.length;
      }

      const progress = completedCount / 604;
      await db.update(translationResources)
        .set({ downloadProgress: progress })
        .where(eq(translationResources.translationId, id));
      
      onProgress(progress);
    }
    console.log(`[TranslationService] Download complete for ${name} (${id})`);
  } catch (error) {
    console.error(`[TranslationService] Failed to download ${name} (${id}):`, error);
    throw error;
  } finally {
    activeDownloads.delete(id);
  }
}

export function isDownloading(id: number) {
  return activeDownloads.has(id);
}
