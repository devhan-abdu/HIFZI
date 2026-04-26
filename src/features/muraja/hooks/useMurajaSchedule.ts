import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { murajaService } from '../services/murajaService';
import { IDailyMurajaLog } from '../types';

export function useMurajaDashboard(userId: string) {
  return useQuery({
    queryKey: ['muraja-dashboard', userId],
    queryFn: () => murajaService.getDashboardState(userId),
    enabled: !!userId,
  });
}

export function useUpsertMurajaLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, log }: { userId: string; log: IDailyMurajaLog }) =>
      murajaService.upsertLog(userId, log),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['muraja-dashboard', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-stats', userId] });
    },
  });
}
