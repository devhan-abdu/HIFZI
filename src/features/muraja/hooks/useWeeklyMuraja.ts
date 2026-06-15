import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/src/hooks/useSession";
import { murajaService } from "../services/murajaService";

export const useWeeklyMuraja = () => {
  const { user } = useSession();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["muraja-dashboard", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return murajaService.getDashboardState(user.id);
    },
    enabled: !!user?.id,
    staleTime: 0,
  });

  return { data, isLoading, isError, refetch };
};
