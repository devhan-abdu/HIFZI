import { File, Paths } from "expo-file-system";
import {
  getCachedPageImageUri,
  setCachedPageImageUri,
} from "./mushafResourceCache";

const BASE_URL =
  "https://uungvwtrbfqatqtqbqef.supabase.co/storage/v1/object/quran-pages/";
const TOTAL_PAGES = 604;
const activeDownloads = new Map<number, Promise<string | null>>();

/** Tracks which pages exist on disk — refreshed once per bulk download session */
let downloadedSet: Set<number> | null = null;

function pageFile(page: number): File {
  return new File(Paths.document, `page_${page}.png`);
}

export function getLocalPageUri(page: number): string | null {
  const cached = getCachedPageImageUri(page);
  if (cached) return cached;

  const file = pageFile(page);
  if (file.exists) {
    setCachedPageImageUri(page, file.uri);
    return file.uri;
  }
  return null;
}

export function isPageDownloaded(page: number): boolean {
  if (downloadedSet?.has(page)) return true;
  if (getCachedPageImageUri(page)) return true;
  return pageFile(page).exists;
}

async function buildDownloadedSet(): Promise<Set<number>> {
  const set = new Set<number>();
  for (let p = 1; p <= TOTAL_PAGES; p++) {
    if (pageFile(p).exists) set.add(p);
  }
  downloadedSet = set;
  return set;
}

export async function countDownloadedPages(): Promise<number> {
  if (downloadedSet) return downloadedSet.size;
  const set = await buildDownloadedSet();
  return set.size;
}

export async function getPageImage(page: number): Promise<string | null> {
  const local = getLocalPageUri(page);
  if (local) return local;

  if (activeDownloads.has(page)) return activeDownloads.get(page)!;

  const downloadPromise = (async () => {
    try {
      const remoteUrl = `${BASE_URL}${page}.png`;
      const file = pageFile(page);
      await File.downloadFileAsync(remoteUrl, file);
      setCachedPageImageUri(page, file.uri);
      downloadedSet?.add(page);
      return file.uri;
    } catch (error) {
      console.error("[ImageService] Download failed:", error);
      return null;
    } finally {
      activeDownloads.delete(page);
    }
  })();

  activeDownloads.set(page, downloadPromise);
  return downloadPromise;
}

const PREFETCH_RADIUS = 5;

export function prefetchPages(currentPage: number): void {
  const pages: number[] = [];
  for (let delta = -PREFETCH_RADIUS; delta <= PREFETCH_RADIUS; delta++) {
    if (delta === 0) continue;
    const p = currentPage + delta;
    if (p >= 1 && p <= TOTAL_PAGES) pages.push(p);
  }
  // Current page first for immediate display, then neighbors
  void getPageImage(currentPage);
  for (const p of pages) {
    void getPageImage(p);
  }
}

export type DownloadProgress = {
  downloaded: number;
  total: number;
  remaining: number;
  percent: number;
  currentPages: number[];
  status: "idle" | "running" | "completed" | "cancelled";
};

export async function downloadAllPages(
  onProgress: (progress: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  const set = downloadedSet ?? (await buildDownloadedSet());
  let downloadedCount = set.size;

  const emit = (currentPages: number[], status: DownloadProgress["status"]) => {
    onProgress({
      downloaded: downloadedCount,
      total: TOTAL_PAGES,
      remaining: TOTAL_PAGES - downloadedCount,
      percent: downloadedCount / TOTAL_PAGES,
      currentPages,
      status,
    });
  };

  emit([], downloadedCount >= TOTAL_PAGES ? "completed" : "running");

  const pending: number[] = [];
  for (let p = 1; p <= TOTAL_PAGES; p++) {
    if (!set.has(p)) pending.push(p);
  }

  if (pending.length === 0) {
    emit([], "completed");
    return;
  }

  const concurrency = 8;

  for (let i = 0; i < pending.length; i += concurrency) {
    if (signal?.aborted) {
      emit([], "cancelled");
      return;
    }

    const batch = pending.slice(i, i + concurrency);
    emit(batch, "running");

    await Promise.all(
      batch.map(async (p) => {
        const uri = await getPageImage(p);
        if (uri) {
          set.add(p);
          downloadedCount = set.size;
        }
      }),
    );

    emit([], "running");
  }

  downloadedSet = set;
  emit([], "completed");
}

export function invalidateDownloadedCache(): void {
  downloadedSet = null;
}
