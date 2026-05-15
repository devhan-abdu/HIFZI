// QuranBootstrap.tsx
import { PropsWithChildren, useEffect, useState } from "react";
import { AppLoadingScreen } from "@/src/components/common/AppLoadingScreen";
import { getJuz, getSurah } from "../services";
import { ensureQuranStorageDirectories } from "../storage/quranStorage";
import { useBookmarkStore } from "../store/bookmarkStore";
import { useCatalogStore } from "../store/catalogStore";
import { useDownloadStore } from "../store/downloadStore";
import { db as stateDb } from "@/src/lib/db/local-client";
import {
  bookmarksLocal,
  quranDownloadJobs,
  quranPackages,
} from "../../quran/database/quranStateSchema";
import { eq, desc, asc } from "drizzle-orm";
import { View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { useSQLiteContext } from "expo-sqlite";
import { runMigrationsSafe } from "@/src/lib/db/runMigrationsSafe";

type BootstrapState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready' };

export function QuranBootstrap({ children }: PropsWithChildren) {
  const [state, setState] = useState<BootstrapState>({ phase: 'loading' });

  const setCatalog = useCatalogStore((s) => s.setCatalog);
  const startHydration = useCatalogStore((s) => s.startHydration);
  const setCatalogError = useCatalogStore((s) => s.setError);
  const setBookmarks = useBookmarkStore((s) => s.setBookmarks);
  const setDownloads = useDownloadStore((s) => s.setDownloads);

  const expoDb = useSQLiteContext();

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const migrationResult = await runMigrationsSafe();
      if (migrationResult.status === 'error') {
        if (!cancelled) setState({ phase: 'error', message: 'db_migration_failed' });
        return;
      }

      try {
        ensureQuranStorageDirectories();
        startHydration();

        const [surahs, juzSections, bookmarkRows, downloadJobs, downloadPackages] =
          await Promise.all([
            getSurah(expoDb),
            getJuz(expoDb),
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

        if (!surahs || !juzSections) throw new Error("Failed to hydrate Quran catalog.");
        if (cancelled) return;

        setCatalog({ surahs, juzSections });
        setBookmarks(bookmarkRows as any);
        setDownloads({ jobs: downloadJobs as any, packages: downloadPackages as any });
        setState({ phase: 'ready' });
      } catch (error) {
        if (cancelled) return;
        setCatalogError("Failed to bootstrap data.");
        setState({ phase: 'ready' }); // still render — catalog error is shown inside the app
      }
    };

    bootstrap();
    return () => { cancelled = true; };
  }, []);

  if (state.phase === 'error') {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text>Something went wrong</Text>
        <Text style={{ textAlign: "center", marginTop: 10 }}>
          We encountered an error updating the database. Please restart the app.
        </Text>
      </View>
    );
  }

  if (state.phase === 'loading') return <AppLoadingScreen />;

  return <>{children}</>;
}