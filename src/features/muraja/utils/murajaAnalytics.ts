import { IMonthHistory } from "@/src/types";
import { IWeeklyMUrajaStatus } from "../types";


export const computeWeeklyReview = (plan: any) => {
  const logs = plan.daily_logs || [];
  
  const summary = logs.reduce((acc: any, log: any) => {
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
  
  logs.forEach((log: any) => {
      if (log && (log.status === "completed" || log.status === "partial")) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else if (log && log.status === "missed") {
              currentStreak = 0
      }
    
   if (log) {
      const plannedPage = plan.plannedPagesPerDay || plan.planned_pages_per_day || 0;
      const actualPages = log.completed_pages || 0;
      const plannedTime = plan.estimatedTimeMin || plan.estimated_time_min || 0;
      const actualTime = log.actual_time_min || 0;

      let dayScore = 0;
      if (actualPages >= plannedPage && plannedPage > 0) {
        dayScore += 100; 
        dayScore += (actualPages - plannedPage) * 5; 
        
          const timeDiff = Math.abs(actualTime - plannedTime);
          dayScore += Math.max(0, 50 - timeDiff); 
      }

      if (dayScore > highestScore) {
        highestScore = dayScore;
        const dateObj = new Date(log.date);
        bestDayName = dateObj.toLocaleDateString('en-US', { weekday: "short" });
      }
    }

  });

  const totalPlannedDays = plan.selectedDays ? (typeof plan.selectedDays === 'string' ? JSON.parse(plan.selectedDays).length : plan.selectedDays.length) : 1;

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

export function calculateTodayTask(params: {
    today: Date;
    weekStartDate: string;
    weekEndDate: string;
    activeDays: number[];
    plannedPagesPerDay: number;
    startPage: number;
    endPage: number;
    murajaLastPage: number;
    dailyLogs: any[];
    surahs: any[];
    getSurahByPage: (page: number, surahs: any[]) => string | undefined;
}) {
    const { today, weekStartDate, weekEndDate, activeDays, plannedPagesPerDay, startPage, endPage, murajaLastPage, dailyLogs, surahs, getSurahByPage } = params;
    
    const todayStr = today.toISOString().slice(0, 10);
    const isPlanActiveNow = today >= new Date(weekStartDate) && today <= new Date(weekEndDate);
    if (!isPlanActiveNow) return null;

    const todayLog = dailyLogs.find((log: any) => log.date === todayStr);
    const isScheduledToday = activeDays.includes((today.getDay() + 6) % 7);

   
    const fallbackStart = Math.max(startPage, (murajaLastPage ?? startPage - 1) + 1);
    const displayStart = todayLog?.startPage ?? todayLog?.start_page ?? fallbackStart;
    
    const quotaEnd = Math.min(displayStart + plannedPagesPerDay - 1, endPage);

    const completed = todayLog?.completedPages ?? todayLog?.completed_pages ?? 0;
    const actualEnd = completed > 0 ? (displayStart + completed - 1) : quotaEnd;
    
    const displayEnd = Math.max(quotaEnd, actualEnd);

    let status: "pending" | "completed" | "partial" | "missed" = "pending";
    if (todayLog) {
        const logStatus = todayLog.status;
        if (logStatus === "missed") {
            status = "missed";
        } else if (completed >= plannedPagesPerDay) {
            status = "completed";
        } else if (completed > 0) {
            status = "partial";
        } else {
            status = "pending";
        }
    }

    const expectedPages = calculateExpectedPages(weekStartDate, weekEndDate, today, activeDays, plannedPagesPerDay);
    const totalCompletedPages = dailyLogs.reduce((acc, curr) => acc + (curr.completedPages ?? curr.completed_pages ?? 0), 0);
    const pageDiff = totalCompletedPages - expectedPages;

    return {
        isCompleted: status === "completed" || (status === "partial" && completed >= plannedPagesPerDay),
        isCatchup: !isScheduledToday && pageDiff < 0,
        status,
        startPage: displayStart,
        endPage: displayEnd,
        quotaEnd: quotaEnd, 
        completedPages: completed,
        startSurah: getSurahByPage(displayStart, surahs) ?? "",
        endSurah: getSurahByPage(displayEnd, surahs) ?? "",
        isVirtualTask: !isScheduledToday && !todayLog,
    };
}