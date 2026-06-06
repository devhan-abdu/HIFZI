export const getTargetPage = (
  selectedDays: number[], 
  plannedTotal: number, 
  completedTotal: number, 
  dailyRate: number,
  dayNumber: number
) => {
  if (dailyRate <= 0) return 0;

  const isPlannedDay = selectedDays.includes(dayNumber);
  const backlog = Math.max(0, plannedTotal - completedTotal);
  const hasBacklog = backlog > 0;

  if (dailyRate <= 0 || (!isPlannedDay && !hasBacklog)) {
    return {
      totalTarget: 0,
      baseTarget: 0,
      catchUpAmount: 0,
      isPlannedDay,
      hasBacklog: false
    };
  }

  let baseTarget = isPlannedDay ? dailyRate : 0;
  let catchUpAmount = 0;

  if (hasBacklog) {
    catchUpAmount = Math.min(Math.floor(dailyRate / 2), backlog);
    
    if (!isPlannedDay && catchUpAmount === 0 && backlog > 0) {
      catchUpAmount = 1;
    }
  }

  return {
    totalTarget: baseTarget + catchUpAmount,
    baseTarget,
    catchUpAmount,
    isPlannedDay,
    hasBacklog
  };
};
