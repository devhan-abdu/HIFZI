import { useState, useEffect, useMemo } from "react";
import { useSQLiteContext } from "expo-sqlite";
import {
  getAyahBBoxesByPage,
  getPageImage,
  getLocalPageUri,
} from "../../quran/services";
import {
  getCachedBboxes,
  setCachedBboxes,
} from "../../quran/services/mushafResourceCache";
import { calculateScale, ScaleMode } from "../utils/coordinates";
import { groupBboxesByAyah } from "../utils/bboxGrouping";
import { AyahBbox } from "../../quran/type";

export function useMushafPage(
  page: number,
  containerWidth: number,
  containerHeight: number,
  mode: ScaleMode = "cover",
) {
  const db = useSQLiteContext();
  const initialUri = getLocalPageUri(page);
  const initialBboxes = getCachedBboxes(page);

  const [imageUri, setImageUri] = useState<string | null>(initialUri);
  const [bboxes, setBboxes] = useState<AyahBbox[]>(initialBboxes ?? []);
  const [loading, setLoading] = useState(!initialUri);
  const [retryCount, setRetryCount] = useState(0);
  const retry = () => setRetryCount((prev) => prev + 1);

  const naturalWidth = 1300;
  const naturalHeight = 2103;

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const hasLocalImage = !!getLocalPageUri(page);
      const hasBboxes = (getCachedBboxes(page)?.length ?? 0) > 0;

      if (!hasLocalImage || !hasBboxes) {
        setLoading(true);
      }

      try {
        const bboxPromise = hasBboxes
          ? Promise.resolve(getCachedBboxes(page)!)
          : getAyahBBoxesByPage(page, db).then((fetched) => {
              if (fetched.length > 0) setCachedBboxes(page, fetched);
              return fetched;
            });

        const imagePromise = hasLocalImage
          ? Promise.resolve(getLocalPageUri(page))
          : getPageImage(page);

        const [uri, fetchedBboxes] = await Promise.all([
          imagePromise,
          bboxPromise,
        ]);

        if (!cancelled) {
          if (uri) setImageUri(uri);
          if (fetchedBboxes.length > 0) setBboxes(fetchedBboxes);
        }
      } catch (error) {
        console.error("Error loading mushaf page:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [page, db, retryCount]);

  const ayahRegions = useMemo(() => {
    if (!containerWidth || !containerHeight || bboxes.length === 0) return [];

    const { scale, offsetX, offsetY } = calculateScale(
      containerWidth,
      containerHeight,
      naturalWidth,
      naturalHeight,
      mode,
    );

    return groupBboxesByAyah(bboxes, scale, offsetX, offsetY);
  }, [bboxes, containerWidth, containerHeight, naturalWidth, naturalHeight, mode]);

  return {
    imageUri,
    ayahRegions,
    bboxes,
    loading: loading && !imageUri,
    naturalWidth,
    naturalHeight,
    retry,
  };
}
