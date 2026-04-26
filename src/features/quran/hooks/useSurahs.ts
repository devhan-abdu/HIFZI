import { useQuery } from '@tanstack/react-query';
import { quranService } from '../services/quranService';

export function useSurahs() {
  return useQuery({
    queryKey: ['surahs'],
    queryFn: () => quranService.getSurahs(),
  });
}

export function useJuz() {
  return useQuery({
    queryKey: ['juz'],
    queryFn: () => quranService.getJuz(),
  });
}
