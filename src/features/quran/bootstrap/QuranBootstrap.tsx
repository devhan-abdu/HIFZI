import { PropsWithChildren, useEffect, useState } from "react";
import { View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { AppLoadingScreen } from "@/src/components/common/AppLoadingScreen";
import { getJuz, getSurah } from "../services";
import { ensureQuranStorageDirectories } from "../storage/quranStorage";
import { useBookmarkStore } from "../store/bookmarkStore";
import { useCatalogStore } from "../store/catalogStore";
import { useDownloadStore } from "../store/downloadStore";
import { getStateDb } from "@/src/lib/db/local-client"; 
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "@/drizzle/migrations";
import {
  bookmarksLocal,
  quranDownloadJobs,
  quranPackages,
} from "../../quran/database/quranStateSchema";
import { eq, desc, asc, isNull } from "drizzle-orm";
import { useSQLiteContext } from "expo-sqlite";

export function QuranBootstrap({ children }: PropsWithChildren) {
  // Fetch the safe shared instance safely at render runtime
  const stateDb = getStateDb();
  
  const { success, error: migrationError } = useMigrations(stateDb, migrations);
  const setCatalog = useCatalogStore((store) => store.setCatalog);
  const startHydration = useCatalogStore((store) => store.startHydration);
  const setCatalogError = useCatalogStore((store) => store.setError);
  const setBookmarks = useBookmarkStore((store) => store.setBookmarks);
  const setDownloads = useDownloadStore((store) => store.setDownloads);

  const [ready, setReady] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const expoDb = useSQLiteContext(); 

  useEffect(() => {
    if (!success) return;
    let cancelled = false;

    const bootstrap = async () => {
      try {
        ensureQuranStorageDirectories();
        startHydration();

        const [
          surahs,
          juzSections,
          bookmarkRows,
          downloadJobs,
          downloadPackages,
        ] = await Promise.all([
          getSurah(expoDb),
          getJuz(expoDb),
          stateDb
            .select()
            .from(bookmarksLocal)
            .where(isNull(bookmarksLocal.deletedAt))
            .orderBy(desc(bookmarksLocal.updatedAt)),
          stateDb
            .select()
            .from(quranDownloadJobs)
            .orderBy(desc(quranDownloadJobs.priority), asc(quranDownloadJobs.createdAt)),
          stateDb
            .select()
            .from(quranPackages)
            .orderBy(asc(quranPackages.packageType), asc(quranPackages.packageKey)),
        ]);

        if (!surahs || !juzSections) {
          throw new Error("Core Quran asset catalog data returned empty.");
        }

        if (cancelled) return;

        setCatalog({ surahs, juzSections });
        setBookmarks(bookmarkRows as any);
        setDownloads({
          jobs: downloadJobs as any,
          packages: downloadPackages as any,
        });
        
        setReady(true);
      } catch (error: any) {
        if (cancelled) return;
        setCatalogError("Failed to bootstrap data.");
        setBootstrapError(error?.message || "Unknown data boot exception.");
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [success, expoDb]);

  if (migrationError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#fff" }}>
        <Text style={{ fontWeight: "bold", color: "red", fontSize: 16 }}>Migration Blocked</Text>
        <Text style={{ textAlign: "center", marginTop: 10, color: "#333" }}>{migrationError.message}</Text>
      </View>
    );
  }

  if (bootstrapError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#fff" }}>
        <Text style={{ fontWeight: "bold", color: "red", fontSize: 16 }}>Bootstrap Process Blocked</Text>
        <Text style={{ textAlign: "center", marginTop: 10, color: "#333" }}>{bootstrapError}</Text>
      </View>
    );
  }

  if (!success || !ready) {
    return <AppLoadingScreen />;
  }

  return <>{children}</>;
}
