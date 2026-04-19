import { PropsWithChildren, useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";

import { AppLoadingScreen } from "@/src/components/common/AppLoadingScreen";
import { useQuranStateDb } from "@/src/lib/db/QuranStateDatabaseProvider";

import { getJuz, getSurah } from "../services";
import { ensureQuranStorageDirectories } from "../storage/quranStorage";
import { useBookmarkStore } from "../store/bookmarkStore";
import { useCatalogStore } from "../store/catalogStore";
import { useDownloadStore } from "../store/downloadStore";

type DownloadJobRow = {
  jobId: string;
  jobType: string;
  resourceId: string;
  status: string;
  progress: number;
  localUri: string | null;
};

type DownloadPackageRow = {
  packageKey: string;
  packageType: string;
  status: string;
  progress: number;
};

type BookmarkRow = {
  localId: string;
  remoteId: string | null;
  userId: string;
  verseKey: string;
  pageNumber: number;
  syncStatus: string;
  syncError: string | null;
  updatedAt: string;
};

export function QuranBootstrap({ children }: PropsWithChildren) {
  const coreDb = useSQLiteContext();
  const stateDb = useQuranStateDb();
  const status = useCatalogStore((store) => store.status);
  const setCatalog = useCatalogStore((store) => store.setCatalog);
  const startHydration = useCatalogStore((store) => store.startHydration);
  const setCatalogError = useCatalogStore((store) => store.setError);
  const setBookmarks = useBookmarkStore((store) => store.setBookmarks);
  const setDownloads = useDownloadStore((store) => store.setDownloads);
  const [ready, setReady] = useState(status === "ready");

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        ensureQuranStorageDirectories();
        startHydration();

        const [surahs, juzSections, bookmarkRows, downloadJobs, downloadPackages] =
          await Promise.all([
            getSurah(coreDb),
            getJuz(coreDb),
            stateDb.getAllAsync<BookmarkRow>(
              `SELECT
                local_id as localId,
                remote_id as remoteId,
                user_id as userId,
                verse_key as verseKey,
                page_number as pageNumber,
                sync_status as syncStatus,
                sync_error as syncError,
                updated_at as updatedAt
              FROM bookmarks_local
              WHERE deleted_at IS NULL
              ORDER BY updated_at DESC`,
            ),
            stateDb.getAllAsync<DownloadJobRow>(
              `SELECT
                job_id as jobId,
                job_type as jobType,
                resource_id as resourceId,
                status,
                progress,
                local_uri as localUri
              FROM quran_download_jobs
              ORDER BY priority DESC, created_at ASC`,
            ),
            stateDb.getAllAsync<DownloadPackageRow>(
              `SELECT
                package_key as packageKey,
                package_type as packageType,
                status,
                progress
              FROM quran_packages
              ORDER BY package_type ASC, package_key ASC`,
            ),
          ]);

        if (!surahs || !juzSections) {
          throw new Error("Failed to hydrate Quran catalog.");
        }

        if (cancelled) {
          return;
        }

        setCatalog({ surahs, juzSections });
        setBookmarks(bookmarkRows);
        setDownloads({ jobs: downloadJobs, packages: downloadPackages });
        setReady(true);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Failed to bootstrap Quran data.";
        setCatalogError(message);
        setBookmarks([]);
        setDownloads({ jobs: [], packages: [] });
        setReady(true);
      }
    };

    if (!ready || status !== "ready") {
      void hydrate();
    }

    return () => {
      cancelled = true;
    };
  }, [
    coreDb,
    ready,
    setBookmarks,
    setCatalog,
    setCatalogError,
    setDownloads,
    startHydration,
    stateDb,
    status,
  ]);

  if (!ready) {
    return <AppLoadingScreen />;
  }

  return children;
}
