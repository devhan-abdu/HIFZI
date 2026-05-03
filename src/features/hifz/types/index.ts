import * as Yup from "yup";

export interface IHifzLog {
    id?: number;
    hifz_plan_id: number;
    actual_start_page: number;
    actual_end_page: number;
    actual_pages_completed: number;
    date: string;
    log_day: number;
    status: "completed" | "partial" | "missed",
    notes?: string;
    mistakes_count?: number;
    hesitation_count?: number;
    quality_score?: number;
    actual_minutes_spent?: number;
};



export interface IHifzPlan {
  user_id?: string,
  id?: number;                 
  start_surah: number;
  start_page: number;
  total_pages: number;
  pages_per_day: number;
  selected_days: number[];
  days_per_week: number
  start_date: string;         
  estimated_end_date: string;  
  direction: 'forward' | "backward", 
  status?: "active" | "completed" | "paused";
  preferred_time?: string;
  is_custom_time?: boolean;
  is_reinforcement_enabled?: boolean;
  hifz_daily_logs?: IHifzLog[]
}
export interface HifzQuestion {
 type: 'SEQUENCE' | 'BOUNDARY';
  question: string;
  answer: any;
  hint?: string;
}

export const HifzPlanSchema = Yup.object({
  start_date: Yup.string().required("Start date is required"),
  start_surah: Yup.number().required("Start surah is required").min(1).max(114),
  start_page: Yup.number().required("Start page is required").min(1).max(604),
  
  direction: Yup.string().oneOf(['forward', 'backward']).required().default("forward"),
  selectedDays: Yup.array()
   .of(Yup.number().required())
   .min(1, "select at least one day")
   .required("please select days"),
    
  pages_per_day: Yup.number()
    .required("Pages per day required")
    .min(0.1, "Minimum 0.1 page") 
    .typeError("Must be a number"),
      
  preferred_time: Yup.string().required("Habit trigger is required").default("fajr"),
  is_custom_time: Yup.boolean().default(false),
  is_reinforcement_enabled: Yup.boolean().default(true),
});


export type HifzPlanSchemaFormType = Yup.InferType<typeof HifzPlanSchema>;
