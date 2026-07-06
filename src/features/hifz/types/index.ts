import * as Yup from "yup";

export interface IHifzLog {
    id?: number;
    hifzPlanId: number;
    actualStartPage: number;
    actualEndPage: number;
    actualPagesCompleted: number;
    date: string;
    logDay: number;
    status: "completed" | "partial" | "missed" | "pending",
    notes?: string;
    mistakesCount?: number;
    hesitationCount?: number;
    qualityScore?: number;
    actualMinutesSpent?: number;
};

export interface IHifzPlan {
  userId?: string,
  id?: number;                 
  startSurah: number;
  startPage: number;
  totalPages: number;
  pagesPerDay: number;
  selectedDays: number[];
  daysPerWeek: number
  startDate: string;         
  estimatedEndDate: string;  
  direction: 'forward' | "backward", 
  status?: "active" | "completed" | "paused";
  preferredTime?: string;
  isCustomTime?: boolean;
  isReinforcementEnabled?: boolean;
  evaluationDay?: number;
  hifzDailyLogs?: IHifzLog[],
  todayLog?: IHifzLog | null,
  evaluationDue?: boolean;
  planFinished?: boolean;
}
export interface HifzQuestion {
  type: 'SEQUENCE' | 'BOUNDARY' | 'CHOICE';
  question: string;
  answer: any;
  hint?: string;
  page?: number;
  crossesSurah?: boolean;
  currentSoraid?: number;
}

export const HifzPlanSchema = Yup.object({
  start_date: Yup.string()
    .required("Start date is required")
    .test(
      "not-in-past",
      "Start date cannot be in the past",
      (value) => {
        if (!value) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selected = new Date(value);
        selected.setHours(0, 0, 0, 0);
        return selected >= today;
      }
    ),
  start_surah: Yup.number().required("Start surah is required").min(1).max(114),
  start_page: Yup.number().required("Start page is required").min(1).max(604),
  total_pages: Yup.number().optional().min(1).max(604),
  
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
  evaluation_day: Yup.number().required("Evaluation day is required").min(0).max(6).default(5),
});


export type HifzPlanSchemaFormType = Yup.InferType<typeof HifzPlanSchema>;
