import { Directory, File, Paths } from "expo-file-system";

const BASE_URL = "https://uungvwtrbfqatqtqbqef.supabase.co/storage/v1/object/quran-pages/";
const activeDownloads = new Map<number, Promise<string | null>>();

export async function getPageImage(page: number): Promise<string | null> {
  const pageFile = new File(Paths.document, `page_${page}.png`);
  if (pageFile.exists) return pageFile.uri;

  if (activeDownloads.has(page)) return activeDownloads.get(page)!;

  const downloadPromise = (async () => {
    try {
      const remoteUrl = `${BASE_URL}${page}.png`;
      await File.downloadFileAsync(remoteUrl, pageFile);
      return pageFile.uri;
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

export async function prefetchPages(currentPage: number) {
  const pages = [
    currentPage - 1,
    currentPage + 1,
    currentPage + 2,
    currentPage + 3,
    currentPage + 4,
    currentPage + 5,
  ];
  for (const p of pages) {
    if (p >= 1 && p <= 604) {
      void getPageImage(p); 
    }
  }
}

export function isPageDownloaded(page: number): boolean {
  const pageFile = new File(Paths.document, `page_${page}.png`);
  return pageFile.exists;
}

export async function countDownloadedPages(): Promise<number> {
  let count = 0;
  for (let p = 1; p <= 604; p++) {
    const pageFile = new File(Paths.document, `page_${p}.png`);
    if (pageFile.exists) {
      count++;
    }
  }
  return count;
}

export async function downloadAllPages(
  onProgress: (downloaded: number, total: number) => void,
  signal?: AbortSignal
): Promise<void> {
  const pages = Array.from({ length: 604 }, (_, i) => i + 1);
  const concurrency = 4;
  
  let downloadedCount = await countDownloadedPages();
  onProgress(downloadedCount, 604);

  for (let i = 0; i < pages.length; i += concurrency) {
    if (signal?.aborted) break;
    const batch = pages.slice(i, i + concurrency);
    
    // Filter batch to only include pages not yet downloaded
    const toDownload = batch.filter(p => !isPageDownloaded(p));
    
    if (toDownload.length > 0) {
      await Promise.all(toDownload.map(p => getPageImage(p)));
      downloadedCount = await countDownloadedPages();
    }
    
    onProgress(downloadedCount, 604);
  }
}
