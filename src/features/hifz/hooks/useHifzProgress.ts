import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hifzService } from '../services/hifzService';
import { IHifzLog } from '../types';

export function useHifzPlan(userId: string) {
  return useQuery({
    queryKey: ['hifz-plan', userId],
    queryFn: () => hifzService.getPlan(userId),
    enabled: !!userId,
  });
}

export function useUpdateHifzLog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, log }: { userId: string; log: IHifzLog }) => 
      hifzService.todayLog(userId, log),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['hifz-plan', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-stats', userId] });
    },
  });
}
