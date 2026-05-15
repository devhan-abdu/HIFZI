import { useQuery } from '@tanstack/react-query';
import { getJuz, getSurah } from '../services';
// import { quranService } from '../services/quranService';

export function useSurahs() {
  return useQuery({
    queryKey: ['surahs'],
    queryFn: () => getSurah(),
  });
}

export function useJuz() {
  return useQuery({
    queryKey: ['juz'],
    queryFn: () => getJuz(),
  });
}
