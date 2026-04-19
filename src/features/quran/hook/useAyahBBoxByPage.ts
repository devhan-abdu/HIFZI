import { useState, useEffect } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { AyahBbox } from "../type";
import { getAyahBBoxesByPage } from "../services";


export function useAyahBBoxByPage(page: number) {
  const [bboxes, setBboxes] = useState<AyahBbox[]>([]);
  const db = useSQLiteContext();

  useEffect(() => {
    let isCancelled = false;

    const fetchAyahs = async () => {
      const result = await getAyahBBoxesByPage(db, page);

      if (!isCancelled) {
        setBboxes(result);
      }
    };

    void fetchAyahs();

    return () => {
      isCancelled = true;
    };
  }, [page, db]);

  return { bboxes };
}
