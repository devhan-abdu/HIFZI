import { useQuery } from '@tanstack/react-query';
import { quranService } from '../services/quranService';

export function useAyahBboxes(page: number) {
  return useQuery({
    queryKey: ['ayah-bboxes', page],
    queryFn: () => quranService.getAyahBBoxesByPage(page),
    enabled: !!page,
  });
}

export function usePageData(page: number) {
  return useQuery({
    queryKey: ['page-data', page],
    queryFn: () => quranService.getPageData(page),
    enabled: !!page,
  });
}
