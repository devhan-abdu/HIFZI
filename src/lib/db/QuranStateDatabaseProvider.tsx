import { PropsWithChildren, createContext, useContext, useEffect, useState } from "react";
import { type SQLiteDatabase, openDatabaseAsync } from "expo-sqlite";

import { AppLoadingScreen } from "@/src/components/common/AppLoadingScreen";

import { QURAN_STATE_DB_NAME } from "./constants";
import { initAppDatabase } from "./initAppDatabase";

type DbStatus = "loading" | "ready" | "error";
const QuranStateDatabaseContext = createContext<SQLiteDatabase | null>(null);

export function QuranStateDatabaseProvider({ children }: PropsWithChildren) {
  const [database, setDatabase] = useState<SQLiteDatabase | null>(null);
  const [status, setStatus] = useState<DbStatus>("loading");
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
        setStatus("ready");
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ?
              loadError
            : new Error("Failed to open Quran state database."),
          );
          setStatus("error");
        }

      }
    };

    void loadDatabase();

    return () => {
      cancelled = true;
    };
  }, []);

if (status === "loading") {
  return <AppLoadingScreen />;
}

if (status === "error") {
  throw error;
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
