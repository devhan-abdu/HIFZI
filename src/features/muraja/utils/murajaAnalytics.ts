import { IMonthHistory } from "@/src/types";
import { IWeeklyMUrajaStatus } from "../types";


export const computeWeeklyReview = (plan: IMonthHistory) => {
  const days = plan.weekly_plan_days || [];
  
 

 const summary = days.reduce((acc, day) => {
    const log = day.daily_muraja_logs?.[0];
    if (log) {
      if (log.status === "completed") acc.completed++;
      if (log.status === "missed") acc.missed++;
      if (log.status === "partial") acc.partial++;
      acc.totalTime += log.actual_time_min || 0;
      acc.totalPages += log.completed_pages || 0;
      acc.logCount++;
    }
    return acc;
  }, { completed: 0, missed: 0, partial: 0, totalTime: 0, totalPages: 0, logCount: 0 });
      

  let maxStreak = 0;
  let currentStreak = 0;
  let bestDayName = "N/A"
  let highestScore = -1;
  
  days.forEach(day => {
    const activity = day.daily_muraja_logs?.[0]
    
      if (activity && (activity.status === "completed" || activity.status === "partial")) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else if (activity && activity.status === "missed") {
              currentStreak = 0
      }
    
   if (activity) {
      const plannedPage = day.planned_pages || 0;
      const actualPages = activity.completed_pages || 0;
      const plannedTime = plan.estimated_time_min || 0;
      const actualTime = activity.actual_time_min || 0;

      let dayScore = 0;
      if (actualPages >= plannedPage && plannedPage > 0) {
        dayScore += 100; 
        dayScore += (actualPages - plannedPage) * 5; 
        
          const timeDiff = Math.abs(actualTime - plannedTime);
          dayScore += Math.max(0, 50 - timeDiff); 
      }

      if (dayScore > highestScore) {
        highestScore = dayScore;
        bestDayName = day.day_of_week;
      }
    }

  });

  const totalPlannedDays = days.length || 1

 return {
    completed: summary.completed,
    missed: summary.missed,
    partial: summary.partial,
    totalTime: summary.totalTime,
    totalPages: summary.totalPages,
    longestStreak: maxStreak,
    bestDay: bestDayName,
    avgSession: summary.logCount ? Math.round(summary.totalTime / summary.logCount) : 0,
    completionRate: Math.round((summary.completed / totalPlannedDays) * 100)
  };
};

export function calculateExpectedPages(
        startDateStr: string,
        endDateStr: string,
        targetDate: Date,
        activeDays: number[],
        rate: number
): number {

   let expectedDaysPassed = 0;
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        const tempDate = new Date(start);

       
        while (tempDate < targetDate && tempDate <= end) {
            if (activeDays.includes((tempDate.getDay() + 6 ) % 7)) {
                expectedDaysPassed++;
            }
            tempDate.setDate(tempDate.getDate() + 1);
        }

        return expectedDaysPassed * rate;
}
    

export function getPerformanceStatus(diff: number): 'ahead' | 'behind' | 'on-track' {
        if (diff < 0) return 'behind';
        if (diff > 0) return 'ahead';
        return 'on-track';
}
    
export function generateWeeklyProgress(
        startDateStr: string, 
        todayStr: string, 
        activeDays: number[], 
        logs: any[]
): IWeeklyMUrajaStatus[]{
  
       const progress: IWeeklyMUrajaStatus[] = [];
        let calendarDate = new Date(startDateStr);

        for (let i = 0; i < 7; i++) {
            const dateStr = calendarDate.toISOString().slice(0, 10);
            const log = logs.find(l => l.date === dateStr);
            const isSelected = activeDays.includes((calendarDate.getDay()+ 6) % 7);
            const isPast = dateStr < todayStr;

              let status: IWeeklyMUrajaStatus['status'] = 'pending';

              if (!isSelected) {
                status = 'rest';

              } else if (log) {
                if (isPast && log.status === 'pending') {
                  status = 'missed'; 
                } else {
                  status = log.status as IWeeklyMUrajaStatus['status'];
                }

              } else {
                if (isPast) {
                  status = 'missed';
                } else {
                  status = 'pending';
                }
              }
          
          
            progress.push({
                date: dateStr,
                dayName: calendarDate.toLocaleDateString('en-US', { weekday: "short" }),
                isToday: dateStr === todayStr,
                isSelected,
                status: status,
                completed: log?.completed_pages ?? 0
            });
            calendarDate.setDate(calendarDate.getDate() + 1);
        }
        return progress;
    }