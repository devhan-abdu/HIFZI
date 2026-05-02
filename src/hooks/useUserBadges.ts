import { useQuery } from "@tanstack/react-query";
import { useSession } from "./useSession";
import { userService } from "../features/user/services/userService";

export function useUserBadges() {
  const { user } = useSession();
  const userId = user?.id ?? "local-user";

  return useQuery({
    queryKey: ["user-badges", userId],
    queryFn: () => userService.getUserBadges(userId),
    enabled: !!userId,
  });
}
