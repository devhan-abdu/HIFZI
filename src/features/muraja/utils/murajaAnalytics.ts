import { IMurajaDayStatus, IWeeklyMUrajaStatus } from "../types";

export const getLocalDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

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
      if (log.qualityScore || log.quality_score) {
        acc.totalQuality += (log.qualityScore || log.quality_score);
        acc.qualityCount++;
      }
    }
    return acc;
  }, { completed: 0, missed: 0, partial: 0, totalTime: 0, totalPages: 0, logCount: 0, totalQuality: 0, qualityCount: 0 });
      
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
    completionRate: Math.round((summary.completed / totalPlannedDays) * 100),
    avgQuality: summary.qualityCount ? parseFloat((summary.totalQuality / summary.qualityCount).toFixed(1)) : 0,
    completedDays: summary.completed,
    partialDays: summary.partial,
    startDate: plan.startDate || plan.start_date || plan.weekStartDate || plan.week_start_date,
  };
};

export const computePlanReview = computeWeeklyReview;

export function calculateExpectedPages(
        startDateStr: string,
        activeDays: number[],
        rate: number,
        targetDate: Date = new Date()
): number {
    const start = new Date(startDateStr);
    const target = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    if (target < start || activeDays?.length === 0) return 0;

    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const totalDaysElapsed = Math.floor((target.getTime() - start.getTime()) / MS_PER_DAY) + 1;
    
    const fullWeeks = Math.floor(totalDaysElapsed / 7);
    const remainingDays = totalDaysElapsed % 7;

    let plannedDaysElapsed = fullWeeks * activeDays?.length;
    const startDayOfWeek = (start.getDay() + 6) % 7;

    for (let i = 0; i < remainingDays; i++) {
        const currentDay = (startDayOfWeek + i) % 7;
        if (activeDays.includes(currentDay)) {
            plannedDaysElapsed++;
        }
    }

    return plannedDaysElapsed * rate;
}

export function getPerformanceStatus(diff: number): 'ahead' | 'behind' | 'on-track' {
        if (diff < 0) return 'behind';
        if (diff > 0) return 'ahead';
        return 'on-track';
}


export function parseLocalDate(dateStr: string): Date {
    if (!dateStr) return new Date(NaN);
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return new Date(NaN);
    return new Date(y, m - 1, d);
}

export function generateRolling7DayWindow(
    planStartDateStr: string,
    planEndDateStr: string,
    activeDays: number[],
    logs: any[],
    today: Date = new Date(),
): IMurajaDayStatus[] {
    const todayStr = getLocalDateString(today);
    const planStart = parseLocalDate(planStartDateStr);
    const planEnd = parseLocalDate(planEndDateStr);
    const todayLocal = parseLocalDate(todayStr);

    const hasValidPlan =
        !Number.isNaN(planStart.getTime()) && !Number.isNaN(planEnd.getTime());

    const windowCenter =
        hasValidPlan
            ? todayLocal < planStart
                ? planStart
                : todayLocal > planEnd
                  ? planEnd
                  : todayLocal
            : todayLocal;

    let windowStart = new Date(windowCenter);
    windowStart.setDate(windowCenter.getDate() - 3);
    let windowEnd = new Date(windowCenter);
    windowEnd.setDate(windowCenter.getDate() + 3);

    if (hasValidPlan) {
        if (windowStart < planStart) windowStart = new Date(planStart);
        if (windowEnd > planEnd) windowEnd = new Date(planEnd);

        const MS_PER_DAY = 1000 * 60 * 60 * 24;
        let windowDays =
            Math.round(
                (windowEnd.getTime() - windowStart.getTime()) / MS_PER_DAY,
            ) + 1;

        if (windowDays < 7) {
            const shortage = 7 - windowDays;
            const potentialEnd = new Date(windowEnd);
            potentialEnd.setDate(windowEnd.getDate() + shortage);
            if (potentialEnd <= planEnd) {
                windowEnd = potentialEnd;
            } else {
                const potentialStart = new Date(windowStart);
                potentialStart.setDate(windowStart.getDate() - shortage);
                windowStart =
                    potentialStart < planStart ? planStart : potentialStart;
                const newDays =
                    Math.round(
                        (windowEnd.getTime() - windowStart.getTime()) /
                            MS_PER_DAY,
                    ) + 1;
                if (newDays < 7) {
                    const potentialEnd2 = new Date(windowEnd);
                    potentialEnd2.setDate(
                        windowEnd.getDate() + (7 - newDays),
                    );
                    if (potentialEnd2 <= planEnd) windowEnd = potentialEnd2;
                }
            }
        }
    }

    const result: IMurajaDayStatus[] = [];
    const cursor = new Date(windowStart);

    while (cursor <= windowEnd && result.length < 7) {
        const dateStr = getLocalDateString(cursor);
        const isSelected = activeDays.includes((cursor.getDay() + 6) % 7);
        const isPast = dateStr < todayStr;
        const isToday = dateStr === todayStr;
        const isFuture = dateStr > todayStr;
        const isBeforePlan =
            hasValidPlan && !Number.isNaN(planStart.getTime())
                ? cursor < planStart
                : false;
        const log =
            logs.find((l: any) => l.date === dateStr) ??
            // Legacy: some logs were saved with UTC toISOString dates.
            (isToday
                ? logs.find(
                      (l: any) =>
                          l.date === new Date().toISOString().slice(0, 10),
                  )
                : undefined);
        const completed =
            log?.completed_pages ?? log?.completedPages ?? 0;

        let status: IMurajaDayStatus["status"] = "pending";

        if (log) {
            const raw = (log.status ?? "pending") as string;
            if (raw === "completed" || raw === "partial") {
                // Day strip treats any successful session as completed.
                status = "completed";
            } else if (raw === "missed") {
                status = "missed";
            } else if (isPast) {
                // Pending/empty log left on a past scheduled day → missed.
                status = "missed";
            } else {
                status = "pending";
            }
        } else if (isBeforePlan) {
            status = "pending";
        } else if (!isSelected) {
            status = "rest";
        } else if (isFuture) {
            status = "future";
        } else if (isPast) {
            // Scheduled past day with no log at all → missed.
            status = "missed";
        } else {
            status = "pending";
        }

        result.push({
            date: dateStr,
            dayName: cursor.toLocaleDateString("en-US", { weekday: "short" }),
            isToday,
            isSelected: isBeforePlan ? false : isSelected,
            status,
            completed,
        });

        cursor.setDate(cursor.getDate() + 1);
    }

    return result;
}

export function generateWeeklyProgress(
    startDateStr: string,
    todayStr: string,
    activeDays: number[],
    logs: any[],
    evaluationDay?: number,
): IWeeklyMUrajaStatus[] {
    const today = new Date(todayStr);

    let calendarDate = new Date(today);
    if (evaluationDay !== undefined) {
        const todayDayOfWeek = (today.getDay() + 6) % 7;
        const evalDayNormalized = evaluationDay;
        const daysSinceCycleStart = (todayDayOfWeek - (evalDayNormalized + 1) + 7) % 7;
        calendarDate.setDate(calendarDate.getDate() - daysSinceCycleStart);
    } else {
        calendarDate.setDate(calendarDate.getDate() - 6);
    }

    const windowEnd = new Date(calendarDate);
    windowEnd.setDate(windowEnd.getDate() + 6);

    const progress: IWeeklyMUrajaStatus[] = [];
    const planStart = new Date(startDateStr);
    planStart.setHours(0, 0, 0, 0);
    const cursor = new Date(calendarDate);

    for (let i = 0; i < 7; i++) {
        const dateStr = getLocalDateString(cursor);
        const log = logs.find((l: any) => l.date === dateStr);
        const isSelected = activeDays.includes((cursor.getDay() + 6) % 7);
        const isPast = dateStr < todayStr;
        const isBeforePlan = cursor < planStart;
        const isFuture = dateStr > todayStr;

        let status: IWeeklyMUrajaStatus['status'] = 'pending';

        if (log) {
            if (isPast && (log.status === 'pending' || !log.status)) {
                status = 'missed';
            } else {
                status = log.status as IWeeklyMUrajaStatus['status'];
            }
        } else if (isBeforePlan) {
            status = 'pending';
        } else if (!isSelected) {
            status = 'rest';
        } else if (isFuture) {
            status = 'future' as any;
        } else {
            status = isPast ? 'missed' : 'pending';
        }

        progress.push({
            date: dateStr,
            dayName: cursor.toLocaleDateString('en-US', { weekday: 'short' }),
            isToday: dateStr === todayStr,
            isSelected: isBeforePlan ? false : isSelected,
            status,
            completed: log?.completed_pages ?? 0,
        });
        cursor.setDate(cursor.getDate() + 1);
    }
    return progress;
}


export function calculateTodayTask(params: {
    today: Date;
    planStartDate: string;
    planEndDate: string;
    activeDays: number[];
    plannedPagesPerDay: number;
    startPage: number;
    endPage: number;
    murajaLastPage: number;
    dailyLogs: any[];
    surahs: any[];
    getSurahByPage: (page: number, surahs: any[]) => string | undefined;
    weekStartDate?: string;
    weekEndDate?: string;
}) {
    const {
        today, planStartDate, planEndDate, activeDays,
        plannedPagesPerDay, startPage, endPage, murajaLastPage,
        dailyLogs, surahs, getSurahByPage,
    } = params;

    const todayStr = getLocalDateString(today);

    const isPlanEnded = today > new Date(planEndDate);
    if (isPlanEnded) return null;

    const todayLog = dailyLogs.find((log: any) => log.date === todayStr);
    const isScheduledToday = activeDays.includes((today.getDay() + 6) % 7);

    const missedPages = _countMissedPages(planStartDate, todayStr, activeDays, dailyLogs, plannedPagesPerDay);

    if (todayLog) {
        const completed = todayLog.completedPages ?? todayLog.completed_pages ?? 0;
        const rawStatus = todayLog.status as 'pending' | 'completed' | 'partial' | 'missed';
        const loggedStartPage = todayLog.startPage ?? todayLog.start_page ?? startPage;
        const derivedLoggedEndPage = Math.min(loggedStartPage + plannedPagesPerDay - 1, endPage);
        const loggedEndPage = todayLog.endPage ?? todayLog.end_page ?? derivedLoggedEndPage;

        const planTargetStart = Math.min(loggedStartPage, loggedEndPage);
        const planTargetEnd = Math.max(loggedStartPage, loggedEndPage);
        const plannedCount = planTargetEnd - planTargetStart + 1;

        const actualEnd = completed > 0 ? (loggedStartPage + completed - 1) : planTargetEnd;
        const displayEnd = Math.max(planTargetEnd, actualEnd);

        let derivedStatus = rawStatus;
        if (rawStatus === 'pending' || !rawStatus) {
            if (completed === 0) derivedStatus = 'missed';
            else if (completed >= plannedCount) derivedStatus = 'completed';
            else derivedStatus = 'partial';
        }

        return {
            isCompleted: derivedStatus === 'completed',
            isCatchup: !!(todayLog.isCatchup != null ? todayLog.isCatchup : todayLog.is_catchup === 1) || missedPages > 0,
            status: derivedStatus,
            startPage: loggedStartPage,
            endPage: displayEnd,
            quotaEnd: planTargetEnd,  
            completedPages: completed,
            startSurah: getSurahByPage(loggedStartPage, surahs) ?? '',
            endSurah: getSurahByPage(displayEnd, surahs) ?? '',
            isVirtualTask: false,
            missedPages,
        };
    }

    const fallbackStart = Math.max(startPage, (murajaLastPage ?? startPage - 1) + 1);
    let finalStart = fallbackStart > endPage ? startPage : fallbackStart;

    const displayStart = finalStart;

    if (!isScheduledToday) {
        if (missedPages > 0) {
            const catchupPages = Math.min(missedPages, plannedPagesPerDay);
            const catchupEnd = Math.min(displayStart + catchupPages - 1, endPage);
            
            return {
                isCompleted: false,
                isCatchup: true,
                status: 'pending' as const,
                startPage: displayStart,
                endPage: catchupEnd,
                quotaEnd: catchupEnd,
                completedPages: 0,
                startSurah: getSurahByPage(displayStart, surahs) ?? '',
                endSurah: getSurahByPage(catchupEnd, surahs) ?? '',
                isVirtualTask: true,
                missedPages,
            };
        }
        const quotaEnd = Math.min(displayStart + plannedPagesPerDay - 1, endPage);
        return {
            isCompleted: false,
            isCatchup: false,
            status: 'pending' as const,
            startPage: displayStart,
            endPage: quotaEnd,
            quotaEnd,
            completedPages: 0,
            startSurah: getSurahByPage(displayStart, surahs) ?? '',
            endSurah: getSurahByPage(quotaEnd, surahs) ?? '',
            isVirtualTask: true,
            isRestDayTask: true,
            missedPages,
        };
    }

    const quotaEnd = Math.min(displayStart + plannedPagesPerDay - 1, endPage);
    
    return {
        isCompleted: false,
        isCatchup: missedPages > 0,
        status: 'pending' as const,
        startPage: displayStart,
        endPage: quotaEnd,
        quotaEnd,
        completedPages: 0,
        startSurah: getSurahByPage(displayStart, surahs) ?? '',
        endSurah: getSurahByPage(quotaEnd, surahs) ?? '',
        isVirtualTask: false,
        missedPages,
    };
}

function _countMissedPages(
    planStartStr: string,
    todayStr: string,
    activeDays: number[],
    dailyLogs: any[],
    plannedPagesPerDay: number,
): number {
    const planStart = new Date(planStartStr);
    const today = new Date(todayStr);
    planStart.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    let missed = 0;
    const cursor = new Date(planStart);

    while (cursor < today) {
        const dateStr = getLocalDateString(cursor);
        const isScheduled = activeDays.includes((cursor.getDay() + 6) % 7);
        if (isScheduled) {
            const log = dailyLogs.find((l: any) => l.date === dateStr);
            const completed = log?.completed_pages ?? log?.completedPages ?? 0;
            if (!log || completed === 0 || log.status === 'missed') {
                missed += plannedPagesPerDay;
            } else if (completed < plannedPagesPerDay) {
                missed += (plannedPagesPerDay - completed);
            }
        }
        cursor.setDate(cursor.getDate() + 1);
    }

    return missed;
}

export function computeRecommendedRate(
    currentRate: number,
    missedDays: number,
    avgQuality: number,
): number {
    if (missedDays >= 4 || avgQuality < 2) {
        const reduction = Math.ceil(currentRate * 0.25);
        return Math.max(1, currentRate - reduction);
    }
    if (missedDays >= 2 || avgQuality < 3) {
        return Math.max(1, currentRate - 2);
    }
    if (missedDays === 0 && avgQuality >= 4) {
        return currentRate;
    }
    return Math.max(1, currentRate - 1);
}