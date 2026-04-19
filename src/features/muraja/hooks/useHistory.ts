import {  useMemo } from "react"
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/src/hooks/useSession";
import { murajaServices } from "../services/murajaServices";
import { calculateStreak } from "../utils/calculateStreak";


export const useHistory = (year:number , month:number) => {
    const { user } = useSession();

    const { data:plans = [], isLoading, isError, refetch } = useQuery({
        queryKey: ["muraja-history", year, month],
        queryFn: () => {
            if (!user?.id) return null;
            return murajaServices.getMonthlyHistory(year, month, user.id);
        },
        enabled: !!user?.id && !!year && !!month , 
    });

   
    const {userHistory, weekHistory} = useMemo(() => {
        if (!plans) return  { userHistory: [], weekHistory: [] };;
        
       const history = plans.flatMap((week) =>
       week.weekly_plan_days.flatMap((day) =>
        day.daily_muraja_logs.map((log) => ({
        date: log.date,
        status: log.status,
         }))))
        
       const reviews = plans
           .map((p) =>( {
           id: p.id,
            week_start_date: p.week_start_date,
            week_end_date: p.week_end_date,
            start_surah: p.start_surah,
            end_surah: p.end_surah,
            start_page: p.start_page,
            end_page: p.end_page,
            start_juz: p.start_juz,
            end_juz: p.end_juz,
            planned_pages: p.planned_pages,
            estimated_time_min: p.estimated_time_min,
            status:p.status
       }))
      .filter((p) => p.status === "completed"); 
        
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
            plan.weekly_plan_days.forEach(day => {
                
                totalPlannedDays++;
                allPlannedDates.add(day.date);


                const log = day.daily_muraja_logs[0]
                if (log && log?.status === "completed" || log?.status === "partial") {
                    completedDates.add(log.date)
                    completedDays++;
                    totalPages += (log.completed_pages || 0)
                    totalMinutes += (log.actual_time_min || 0)
                    
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

