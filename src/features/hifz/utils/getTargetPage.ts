export const getTargetPage = (
  selectedDays: number[],
  /** Pages the user is behind (missed scheduled work). */
  backlogPages: number,
  dailyRate: number,
  dayNumber: number,
) => {
  if (dailyRate <= 0) {
    return {
      totalTarget: 0,
      baseTarget: 0,
      catchUpAmount: 0,
      isCatchup: false,
      isPlannedDay: false,
      hasBacklog: false,
    };
  }

  const isPlannedDay = selectedDays.includes(dayNumber);
  const hasBacklog = backlogPages > 0;

  // On track + rest day → nothing to show.
  if (!isPlannedDay && !hasBacklog) {
    return {
      totalTarget: 0,
      baseTarget: 0,
      catchUpAmount: 0,
      isCatchup: false,
      isPlannedDay: false,
      hasBacklog: false,
    };
  }

  // Behind plan → catchup session at the daily rate (planned or rest day).
  if (hasBacklog) {
    return {
      totalTarget: dailyRate,
      baseTarget: dailyRate,
      catchUpAmount: Math.min(backlogPages, dailyRate),
      isCatchup: true,
      isPlannedDay,
      hasBacklog: true,
    };
  }

  // Planned day, on track.
  return {
    totalTarget: dailyRate,
    baseTarget: dailyRate,
    catchUpAmount: 0,
    isCatchup: false,
    isPlannedDay: true,
    hasBacklog: false,
  };
};
