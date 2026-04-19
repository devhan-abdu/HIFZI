import * as Yup from "yup"
import type { InferType } from "yup";


export const WeeklyMurajaSchema = Yup.object({
  id: Yup.number()
    .min(1, "Invalid ID")
    .transform((value, originalValue) => originalValue === "" ? undefined : Number(originalValue)),



 week_start_date: Yup.string().required("Week start date is required"),

 planned_pages: Yup.number()
    .nullable()
    .transform((value, originalValue) => originalValue === "" ? undefined : Number(originalValue))
    .typeError('Planned pages must be a number') 
    .required("Planned pages required")
    .integer("Planned pages must be a whole number") 
    .min(1, "Planned pages must be greater than zero"), 

  start_surah: Yup.number()
    .nullable()
    .transform((value, originalValue) => originalValue === "" ? undefined : Number(originalValue))
    .typeError('Start surah must be a number')
    .required("Start surah required")
    .integer("Start surah must be a whole number")
    .min(1, "Start surah must be greater than zero"),

  start_page: Yup.number()
    .nullable()
    .transform((value, originalValue) => originalValue === "" ? undefined : Number(originalValue))
    .typeError('Start page must be a number')
    .required("Start page required")
    .integer("Start page must be a whole number")
    .min(1, "Start page must be greater than zero"),

  estimated_time_min: Yup.number()
    .nullable()
    .transform((value, originalValue) => originalValue === "" ? undefined : Number(originalValue))
    .typeError('Estimated time must be a number')
    .required("Estimated time required")
    .integer("Estimated time must be a whole number")
    .min(1, "Estimated time must be greater than zero"),

  selectedDays: Yup.array()
  .of(Yup.number().required())
  .min(1, "select at least one day")
  .required("please select days"),


  place: Yup.string().nullable(),
  note: Yup.string().nullable(),
});

export type WeeklyMurajaFormType = InferType<typeof WeeklyMurajaSchema>;
export type WeeklyMurajaType = Omit<WeeklyMurajaFormType, "selectedDays" | "start_surah"> & {
  user_id: string;
  end_surah: string,
  end_page: number,
  start_juz: number,
  end_juz: number,
  total_days: number,
  start_surah: string,
  week_end_date: string,
  status: "active" | 'completed' | "paused"
};

export interface ISurah {
  number: number,
  startingPage: number,
  endingPage: number,
  name: string,
  englishName: string,
  revelationType: string,
  numberOfAyahs: string,
  revelationOrder: number,
}

export interface IDayLog {
  id: number;
  weekly_plan_day_id: number,
  date: string;
  completed_pages: number,
  actual_time_min: number;
  status: "pending" | "completed" | "partial" | "missed";
  note: string;
  place: string;
  start_surah: string;
  start_page: number;
}
export interface IDayLogAdd 
{
  dayId: number,
  userId: string,
  status: "completed" | "partial" | "missed";
  date: string,
  note: string,
  place: string,
  actual_time_min: number,
  completed_pages: number,
  is_catch_up?:boolean
}

export interface IDayLogSummary {
  id: number;
  weekly_plan_day_id: number;  
  completed_pages: number;
  actual_time_min: number;
  status: "pending" | "completed" | "partial" | "missed";
  date: string;
  note: string;
  place: string;
}

export interface IWeeklyMurajaDay {
    id?: number,
    weekly_plan_id?: number,
    date: string,
    day_of_week: string,
    planned_start_page: number,
    planned_end_page: number,
    planned_pages: number,
    estimated_time_min: number,
    daily_muraja_logs: IDayLogSummary[];
 
}

// days.map(day => ({dayName: day.day_of_week ,stats:day.daily_muraja_logs.status}))


export interface IWeeklyMurajaDayInsert {
  date: string;
  day_of_week: string;
  planned_start_page: number;
  planned_end_page: number;
  planned_pages: number;
  estimated_time_min: number;
  weekly_plan_id?: number; 
}
export type TodayPlanType = IWeeklyMurajaDay & {
  status: "pending" | "completed" | "partial" | "missed";
  log_id: number | null;
  startSurah?: string ;
  endSurah?: string;
  actual_pages: number;
  actual_time: number
};
   

export interface IMonthHistory {
  id: number;
  week_start_date: string;
  week_end_date: string,
  start_surah: string;
  end_surah: string;
  start_page: number;
  end_page: number;
  start_juz: number,
  end_juz: number,
  planned_pages: number;
  estimated_time_min: number;
  status: "active" | 'completed'
  weekly_plan_days: IWeeklyMurajaDay[];
}

export interface IWeeklyMuraja {
  id: number;
  week_start_date: string;
  week_end_date: string,
  start_surah: string;
  end_surah: string;
  start_page: number;
  end_page: number;
  start_juz: number,
  end_juz: number,
  planned_pages: number;
  estimated_time_min: number;
  status: "active" | 'completed'
}



