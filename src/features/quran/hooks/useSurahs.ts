import { useQuery } from '@tanstack/react-query';
import { getJuz, getSurah } from '../services';
import { useSQLiteContext } from 'expo-sqlite';

export function useSurahs() {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['surahs'],
    queryFn: () => getSurah(db),
  });
}

export function useJuz() {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['juz'],
    queryFn: () => getJuz(db),
  });
}
