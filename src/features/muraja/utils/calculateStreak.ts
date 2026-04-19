export function calculateStreak(completedDates: Set<string> ,plannedDates: Set<string>) {
     if (completedDates.size === 0 ) return 0
   
    let streak = 0

   const sortedPlannedDates = Array.from(plannedDates).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );


    for (const dateStr of sortedPlannedDates) {
    if (completedDates.has(dateStr)) {
      streak++;
    } else {
      break; 
    }
  }

    return streak
    
}