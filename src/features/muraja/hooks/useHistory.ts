import {  useMemo } from "react"
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/src/hooks/useSession";
import { murajaService } from "../services/murajaService";
import { calculateStreak } from "../utils/calculateStreak";


export const useHistory = (year:number , month:number) => {
    const { user } = useSession();

    const { data:plans = [], isLoading, isError, refetch } = useQuery({
        queryKey: ["muraja-history", year, month],
        queryFn: () => {
            if (!user?.id) return null;
            return murajaService.getMonthlyHistory(year, month, user.id);
        },
        enabled: !!user?.id && !!year && !!month , 
    });

   
    const {userHistory, weekHistory} = useMemo(() => {
        if (!plans) return  { userHistory: [], weekHistory: [] };;
        
       const history = plans.flatMap((week) =>
        week.daily_muraja_logs.map((log) => ({
          date: log.date,
          status: log.status,
        })));
        
       const reviews = plans
            .map((p) => ({
                id: p.id,
                week_start_date: p.weekStartDate,
                week_end_date: p.weekEndDate,
                start_page: p.startPage,
                end_page: p.endPage,
                planned_pages: p.plannedPagesPerDay,
                estimated_time_min: p.estimatedTimeMin,
                status: p.isActive ? "active" : "completed"
            }));
        
        return { userHistory: history, weekHistory: reviews };
        
    }, [plans]);


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
        

        plans.forEach(plan => {
            plan.daily_muraja_logs.forEach(log => {
                totalPlannedDays++;
                if (log.date) allPlannedDates.add(log.date);

                if (log.status === "completed" || log.status === "partial") {
                    completedDates.add(log.date!)
                    completedDays++;
                    totalPages += (log.completedPages || 0)
                    totalMinutes += (log.actualTimeMin || 0)
                }
            })
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

