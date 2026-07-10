export const getTargetPage = (
  selectedDays: number[], 
  plannedTotal: number, 
  completedTotal: number, 
  dailyRate: number,
  dayNumber: number
) => {
  if (dailyRate <= 0) {
    return {
      totalTarget: 0,
      baseTarget: 0,
      catchUpAmount: 0,
      isCatchup: false,
      isPlannedDay: false,
      hasBacklog: false
    };
  }

  const isPlannedDay = selectedDays.includes(dayNumber);
  const backlog = Math.max(0, plannedTotal - completedTotal);
  const hasBacklog = backlog > 0;

  if (!isPlannedDay && !hasBacklog) {
    return {
      totalTarget: 0,
      baseTarget: 0,
      catchUpAmount: 0,
      isCatchup: false,
      isPlannedDay: false,
      hasBacklog: false
    };
  }

  if (!isPlannedDay && hasBacklog) {
    return {
      totalTarget: dailyRate,
      baseTarget: dailyRate,
      catchUpAmount: dailyRate,
      isCatchup: true,
      isPlannedDay: false,
      hasBacklog: true
    };
  }

  return {
    totalTarget: dailyRate,
    baseTarget: dailyRate,
    catchUpAmount: 0,
    isCatchup: hasBacklog,
    isPlannedDay: true,
    hasBacklog
  };
};
