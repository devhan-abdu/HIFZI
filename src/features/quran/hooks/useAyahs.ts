import { useQuery } from '@tanstack/react-query';
import { getAyahBBoxesByPage, getPageData } from '../services';
import { useSQLiteContext } from 'expo-sqlite';

export function useAyahBboxes(page: number) {
  const db = useSQLiteContext()
  return useQuery({
    queryKey: ['ayah-bboxes', page],
    queryFn: () => getAyahBBoxesByPage(page , db),
    enabled: !!page,
  });
}

export function usePageData(page: number) {
  const db = useSQLiteContext()
  return useQuery({
    queryKey: ['page-data', page],
    queryFn: () => getPageData(page , db),
    enabled: !!page,
  });
}
