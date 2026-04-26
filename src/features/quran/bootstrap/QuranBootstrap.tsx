import { PropsWithChildren, useEffect, useState } from "react";
import { AppLoadingScreen } from "@/src/components/common/AppLoadingScreen";
import { getJuz, getSurah } from "../services";
import { ensureQuranStorageDirectories } from "../storage/quranStorage";
import { useBookmarkStore } from "../store/bookmarkStore";
import { useCatalogStore } from "../store/catalogStore";
import { useDownloadStore } from "../store/downloadStore";
import { db as stateDb } from "@/src/lib/db/local-client";
import { initAppDatabase } from "@/src/lib/db/initAppDatabase";
import { bookmarksLocal, quranDownloadJobs, quranPackages } from "../../quran/database/quranStateSchema";
import { eq, desc, asc } from "drizzle-orm";

export function QuranBootstrap({ children }: PropsWithChildren) {
  const status = useCatalogStore((store) => store.status);
  const setCatalog = useCatalogStore((store) => store.setCatalog);
  const startHydration = useCatalogStore((store) => store.startHydration);
  const setCatalogError = useCatalogStore((store) => store.setError);
  const setBookmarks = useBookmarkStore((store) => store.setBookmarks);
  const setDownloads = useDownloadStore((store) => store.setDownloads);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        console.log("[Bootstrap] Initializing database...");
        await initAppDatabase();

        console.log("[Bootstrap] Hydrating stores...");
        ensureQuranStorageDirectories();
        startHydration();

        const [surahs, juzSections, bookmarkRows, downloadJobs, downloadPackages] = await Promise.all([
          getSurah(),
          getJuz(),
          stateDb.query.bookmarksLocal.findMany({
            where: eq(bookmarksLocal.deletedAt, null as any),
            orderBy: [desc(bookmarksLocal.updatedAt)],
          }),
          stateDb.query.quranDownloadJobs.findMany({
            orderBy: [desc(quranDownloadJobs.priority), asc(quranDownloadJobs.createdAt)],
          }),
          stateDb.query.quranPackages.findMany({
            orderBy: [asc(quranPackages.packageType), asc(quranPackages.packageKey)],
          }),
        ]);

        if (!surahs || !juzSections) {
          throw new Error("Failed to hydrate Quran catalog.");
        }

        if (cancelled) return;

        setCatalog({ surahs, juzSections });
        setBookmarks(bookmarkRows as any);
        setDownloads({ jobs: downloadJobs as any, packages: downloadPackages as any });
        setReady(true);
      } catch (error) {
        if (cancelled) return;
        console.error("[Bootstrap Error]", error);
        setCatalogError("Failed to bootstrap data.");
        setReady(true);
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return <AppLoadingScreen />;
  }

  return children;
}
