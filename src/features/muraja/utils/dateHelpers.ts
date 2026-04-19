
const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function getPlannedDates(
  weekStartDate: string,
  selectedOffsets: number[],
  plannedPages: number,
  startPage: number
) {
  const startDate = new Date(weekStartDate);
  const startDayIdx = (startDate.getDay() + 6) % 7;
  
  const dateObjects = selectedOffsets.map((offset) => {
    let daysToAdd = offset - startDayIdx;
    if (daysToAdd < 0) daysToAdd += 7;
    
    const actualDate = new Date(startDate);
    actualDate.setDate(startDate.getDate() + daysToAdd);
    
    return {
      date: actualDate,
      dateString: actualDate.toISOString().slice(0, 10),
    };
  });
  
  dateObjects.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  const result = dateObjects.map((obj, index) => {
    const planned_start_page = startPage + (index * plannedPages);
    const planned_end_page = planned_start_page + plannedPages - 1;
    
    return {
      date: obj.dateString,
      day_of_week: dayNames[(obj.date.getDay() + 6) % 7],
      planned_start_page,
      planned_end_page,
      planned_pages: plannedPages,
    };
  });
  
  return result;
}

export function formatWeekRange(start?: string | undefined, end?: string): string {
  if(!start || !end) return ""
  const s = new Date(start)
  const e = new Date(end)

  const monthFmt = new Intl.DateTimeFormat("en-us", { month: "short" })
  const dayFmt = new Intl.DateTimeFormat("en-us", { day: "numeric" })
  
  return `${monthFmt.format(s)} ${dayFmt.format(s)} – ${monthFmt.format(e)} ${dayFmt.format(e)}`
}