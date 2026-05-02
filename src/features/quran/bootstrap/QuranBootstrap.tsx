import { PropsWithChildren, useEffect, useState } from "react";
import { AppLoadingScreen } from "@/src/components/common/AppLoadingScreen";
import { getJuz, getSurah } from "../services";
import { ensureQuranStorageDirectories } from "../storage/quranStorage";
import { useBookmarkStore } from "../store/bookmarkStore";
import { useCatalogStore } from "../store/catalogStore";
import { useDownloadStore } from "../store/downloadStore";
import { db as stateDb, expoDb as userStateRawDb } from "@/src/lib/db/local-client";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "@/drizzle/migrations";
import {
  bookmarksLocal,
  quranDownloadJobs,
  quranPackages,
} from "../../quran/database/quranStateSchema";
import { eq, desc, asc } from "drizzle-orm";
import { View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { useSQLiteContext } from "expo-sqlite";

export function QuranBootstrap({ children }: PropsWithChildren) {
  const { success, error: migrationError } = useMigrations(stateDb, migrations);
  const status = useCatalogStore((store) => store.status);
  const setCatalog = useCatalogStore((store) => store.setCatalog);
  const startHydration = useCatalogStore((store) => store.startHydration);
  const setCatalogError = useCatalogStore((store) => store.setError);
  const setBookmarks = useBookmarkStore((store) => store.setBookmarks);
  const setDownloads = useDownloadStore((store) => store.setDownloads);
  const [ready, setReady] = useState(false);

   const expoDb = useSQLiteContext(); 

  useEffect(() => {
    if (!success) return;
    let cancelled = false;

    const bootstrap = async () => {
      try {
        try {
          await userStateRawDb.execAsync(`
            DROP INDEX IF EXISTS unq_user_habit_date;
            CREATE UNIQUE INDEX IF NOT EXISTS unq_user_habit_date ON habit_events (user_id, habit_type, date);
            
            DROP INDEX IF EXISTS unq_user_notification_event;
            CREATE UNIQUE INDEX IF NOT EXISTS unq_user_notification_event ON notifications (user_id, event_key);
          `);
        } catch (e) {
          console.warn("Database self-healing failed:", e);
        }

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
          stateDb.query.bookmarksLocal.findMany({
            where: eq(bookmarksLocal.deletedAt, null as any),
            orderBy: [desc(bookmarksLocal.updatedAt)],
          }),
          stateDb.query.quranDownloadJobs.findMany({
            orderBy: [
              desc(quranDownloadJobs.priority),
              asc(quranDownloadJobs.createdAt),
            ],
          }),
          stateDb.query.quranPackages.findMany({
            orderBy: [
              asc(quranPackages.packageType),
              asc(quranPackages.packageKey),
            ],
          }),
        ]);

        if (!surahs || !juzSections) {
          throw new Error("Failed to hydrate Quran catalog.");
        }

        if (cancelled) return;

        setCatalog({ surahs, juzSections });
        setBookmarks(bookmarkRows as any);
        setDownloads({
          jobs: downloadJobs as any,
          packages: downloadPackages as any,
        });
        setReady(true);
      } catch (error) {
        console.log(error, "errorrrr");
        if (cancelled) return;
        setCatalogError("Failed to bootstrap data.");
        setReady(true);
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [success]);

  if (migrationError) {
    console.log(migrationError, "error from the database");
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text>Something went wrong</Text>
        <Text style={{ textAlign: "center", marginTop: 10 }}>
          We encountered an error updating the database. Please restart the app.
        </Text>
      </View>
    );
  }

  if (!success || !ready) {
    return <AppLoadingScreen />;
  }

  return <>{children}</>;
}
