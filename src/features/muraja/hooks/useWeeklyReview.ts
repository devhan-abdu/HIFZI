import {  useMemo } from "react"
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/src/hooks/useSession";
import { murajaServices } from "../services/murajaServices";
import { computeWeeklyReview } from "../utils/murajaAnalytics";


export const useWeeklyReview = (weekId?: number) => {
    const { user } = useSession();

    const { data:plan, isLoading, isError, refetch } = useQuery({
        queryKey: ["muraja-review", user?.id,weekId],
        queryFn: () => {
            if (!user?.id) return null;
            return murajaServices.getReviewStats(user.id, weekId);
        },
        enabled: !!user?.id,
        
    });

   
    const analytics = useMemo(() => {
       if (!plan) return null;
       return computeWeeklyReview(plan);
     }, [plan]);

    return {
        plan,
        analytics,
        isLoading,
        isError,
        refetch
    };
};

