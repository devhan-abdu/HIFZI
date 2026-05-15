import {  useMemo } from "react"
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/src/hooks/useSession";
import { murajaService } from "../services/murajaService";
import { calculateStreak } from "../utils/calculateStreak";


export const useHistory = (year:number , month:number) => {
    const { user } = useSession();

    const { data: logs = [], isLoading, isError, refetch } = useQuery({
        queryKey: ["muraja-history", year, month],
        queryFn: () => {
            if (!user?.id) return null;
            return murajaService.getMonthlyHistory(year, month, user.id);
        },
        enabled: !!user?.id && !!year && !!month , 
    });

   
    const {userHistory, weekHistory} = useMemo(() => {
        if (!logs) return  { userHistory: [], weekHistory: [] };;
        
       const history = logs.map((log) => ({
          date: log.date,
          status: log.status,
          completedPages: log.completedPages,
          actualTimeMin: log.actualTimeMin,
        }));
        
        return { userHistory: history, weekHistory: [] };
        
    }, [logs]);


    const analytics = useMemo(() => {
        if (!plans || plans.length === 0) return {
        completionRate: 0, 
        longestStreak: 0, 
        totalMinutes: 0, 
        totalPages: 0
        }
        let totalPlannedDays = 0
        let completedDays = 0
        let totalMinutes = 0
        let totalPages = 0

        const completedDates = new Set<string>()
        const allPlannedDates = new Set<string>();
        

        logs.forEach(log => {
            totalPlannedDays++;
            if (log.date) allPlannedDates.add(log.date);

            if (log.status === "completed" || log.status === "partial") {
                completedDates.add(log.date!)
                completedDays++;
                totalPages += (log.completedPages || 0)
                totalMinutes += (log.actualTimeMin || 0)
            }
        })

        const streak = calculateStreak(completedDates, allPlannedDates);

        return {
            completionRate: totalPlannedDays > 0 ? Math.round((completedDays / totalPlannedDays) * 100) : 0,
            longestStreak: streak,
            totalMinutes,
            totalPages
        }
    },[plans])
    
  

    return {
        userHistory,
        weekHistory,
        isLoading,
        isError,
        refetch,
        analytics
    };
};

