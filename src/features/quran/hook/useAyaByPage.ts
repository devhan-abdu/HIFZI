import { useState, useEffect } from "react";
import { useSQLiteContext } from "expo-sqlite";


export function useAyaByPage(page: number) {
  const [ayas, setAyas] = useState<{ id: number; page: number }[]>([]);
  const db = useSQLiteContext();

  useEffect(() => {
    let isCancelled = false;

    const fetchAyas = async () => {
      const result = await db.getAllAsync<{ id: number; page: number }>(
        "SELECT * FROM aya WHERE page = ?",
        [page],
      );

      if (!isCancelled) {
        setAyas(result);
      }
    };

    void fetchAyas();

    return () => {
      isCancelled = true;
    };
  }, [page, db]);

  return { ayas };
}
