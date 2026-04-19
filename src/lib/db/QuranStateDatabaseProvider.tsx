import { PropsWithChildren, createContext, useContext, useEffect, useState } from "react";
import { type SQLiteDatabase, openDatabaseAsync } from "expo-sqlite";

import { AppLoadingScreen } from "@/src/components/common/AppLoadingScreen";

import { QURAN_STATE_DB_NAME } from "./constants";
import { initAppDatabase } from "./initAppDatabase";

const QuranStateDatabaseContext = createContext<SQLiteDatabase | null>(null);

export function QuranStateDatabaseProvider({ children }: PropsWithChildren) {
  const [database, setDatabase] = useState<SQLiteDatabase | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDatabase = async () => {
      try {
        const db = await openDatabaseAsync(QURAN_STATE_DB_NAME);
        await initAppDatabase(db);

        if (cancelled) {
          await db.closeAsync();
          return;
        }

        setDatabase(db);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ?
              loadError
            : new Error("Failed to open Quran state database."),
          );
        }
      }
    };

    void loadDatabase();

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    throw error;
  }

  if (!database) {
    return <AppLoadingScreen />;
  }

  return (
    <QuranStateDatabaseContext.Provider value={database}>
      {children}
    </QuranStateDatabaseContext.Provider>
  );
}

export function useQuranStateDb() {
  const database = useContext(QuranStateDatabaseContext);

  if (!database) {
    throw new Error("useQuranStateDb must be used within QuranStateDatabaseProvider.");
  }

  return database;
}
