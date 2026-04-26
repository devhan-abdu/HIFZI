import { useQuery } from "@tanstack/react-query";
import { useSession } from "./useSession";
import { userService } from "../features/user/services/userService";

export function useUserStats() {
  const { user } = useSession();
  const userId = user?.id ?? "local-user";

  return useQuery({
    queryKey: ["user-stats", userId],
    queryFn: () => userService.getUserStats(userId),
    enabled: !!userId,
  });
}
