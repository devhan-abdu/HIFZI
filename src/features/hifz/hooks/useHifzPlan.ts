import { useSession } from "@/src/hooks/useSession";
import { useQuery } from "@tanstack/react-query";
import { hifzService } from "../services/hifzService";


export const useHifzPlan = () => {
    const { user } = useSession();

    const { data: hifz, isLoading, isError, refetch } = useQuery({
        queryKey: ["hifz", user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            return await hifzService.getPlan(user.id);
        },
        enabled: !!user?.id 
    });

    return {
        hifz,
        isLoading,
        error: isError,
        refetch,
    }
};