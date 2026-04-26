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
  const nextPages = [currentPage + 1, currentPage + 2];
  for (const p of nextPages) {
    if (p >= 1 && p <= 604) {
      getPageImage(p); 
    }
  }
}
