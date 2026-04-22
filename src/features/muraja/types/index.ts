import * as Yup from "yup"
import type { InferType } from "yup";

export interface IWeeklyMurajaPLan {
    id: number;
    remote_id: string | null;
    user_id: string;
    week_start_date: string;
    week_end_date: string;
    planned_pages_per_day: number;
    start_page: number;
    end_page: number;
    is_active: 0 | 1;
    selected_days: string;
    sync_status: number;
    estimated_time_min: number;
    place?: string | null;
    note?: string | null;
}

export interface IUserStats {
    user_id: string;
    hifz_last_page: number;
    hifz_current_streak: number;
    muraja_last_page: number;
    muraja_current_streak: number;
    total_points: number;
    global_longest_streak: number;
    last_sync_time: string | null; 
}


export type MurajaLogStatus = 'pending' | 'completed' | 'partial' | 'missed';

export interface IDailyMurajaLog {
    id?: number;              
    remote_id: string | null; 
    plan_id: number;         
    date: string; 
    
    start_page: number;
    end_page?: number;
    completed_pages: number;
    actual_time_min: number;
    
    status: MurajaLogStatus;
    is_catchup: number; 
    sync_status: number; 

    mistakes_count: number;
    hesitation_count: number;
    quality_score?: number;
}

export type IMurajaDashboardData = IWeeklyMurajaPLan & {
    muraja_last_page: number;
    muraja_current_streak: number;
    daily_logs: IDailyMurajaLog[];
};

export interface IWeeklyPlanDashboardData {
  totalPage: number,
  totalDays: number,
  week_start_date: string,
  week_end_date: string,
  estimated_time_min: number,
  planned_pages_per_day: number,
  start_juz: number,
  end_juz: number,
  startSurah: string,
  endSurah: string
}

export interface IWeeklyMUrajaStatus {
  date: string,
  dayName: string,
  isToday: boolean,
  isSelected: boolean,
  status:'pending' | 'completed' | 'rest' | 'missed',
  completed: number
}


export const WeeklyMurajaSchema = Yup.object({
 week_start_date: Yup.string().required("Week start date is required"),
 planned_pages_per_day: Yup.number()
    .required("Planned pages required")
    .integer("Planned pages must be a whole number") 
    .min(1, "Planned pages must be greater than zero"), 

  start_surah: Yup.number()
    .positive('Start surah must be a number')
    .required("Start surah required")
    .integer("Start surah must be a whole number")
    .min(1, "Start surah must be greater than zero"),

  start_page: Yup.number()
    .positive('Start page must be a number')
    .required("Start page required")
    .integer("Start page must be a whole number"),

  estimated_time_min: Yup.number()
    .nullable()
    .positive()
    .required("Estimated time required")
    .integer("Estimated time must be a whole number")
    .min(1, "Estimated time must be greater than zero"),

  selectedDays: Yup.array()
  .of(Yup.number().required())
  .min(1)
  .required(),


  place: Yup.string().nullable(),
  note: Yup.string().nullable(),
});

export type WeeklyMurajaFormType = Yup.InferType<typeof WeeklyMurajaSchema>;
