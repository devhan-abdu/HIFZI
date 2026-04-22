import { useState, useEffect, useMemo } from 'react';
import { getAyahBBoxesByPage, getPageImage } from '../../quran/services';
import { calculateScale, transformBbox, ScaleMode } from '../utils/coordinates';
import { AyahBbox } from '../../quran/type';
import { useSQLiteContext } from 'expo-sqlite';

export function useMushafPage(
  page: number, 
  containerWidth: number, 
  containerHeight: number,
  
  mode: ScaleMode = 'cover'
) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [bboxes, setBboxes] = useState<AyahBbox[]>([]);
  const [loading, setLoading] = useState(true);
  const db = useSQLiteContext();

 

  const naturalWidth = 1300
  const naturalHeight = 2103;

  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const [uri, fetchedBboxes] = await Promise.all([
          getPageImage(page),
          getAyahBBoxesByPage(db, page)
        ]);

        if (!isCancelled) {
          setImageUri(uri);
          setBboxes(fetchedBboxes);
        }
      } catch (error) {
        console.error('Error loading mushaf page:', error);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [page, db]);

  // Calculate scaled bboxes whenever bboxes or container dimensions change
  const scaledBboxes = useMemo(() => {
    if (!containerWidth || !containerHeight || bboxes.length === 0) return [];

    const { scale, offsetX, offsetY } = calculateScale(
      containerWidth,
      containerHeight,
      naturalWidth,
      naturalHeight,
      mode
    );

    return bboxes.map((bbox) => ({
      ...bbox,
      scaledRect: transformBbox(bbox, scale, offsetX, offsetY)
    }));
  }, [bboxes, containerWidth, containerHeight, naturalWidth, naturalHeight, mode]);

  return {
    imageUri,
    scaledBboxes,
    loading,
    naturalWidth,
    naturalHeight
  };
}
