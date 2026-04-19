export const mock = {
  "id": 1,
  "start_surah": "Al-Baqarah",
  "start_page": 2,

  "days_per_week": 5,
  "target_end_date": "2025-06-30",
  "duration": 180,

  "total_pages": 604,
  "pages_per_day": 2,
  "pages_per_week": 10,

  "start_date": "2025-01-01",
  "estimated_end_date": "2025-06-30",

  "status": "active",

  "HIFZ_PLAN_DAYS": [
    {
      "id": 101,
      "hifz_plan_id": 1,
      "date": "2025-01-05",
      "planned_surah": "Al-Baqarah",
      "planned_end_page": 3,
      "planned_pages": 2,
      "day_of_week": "Sunday",
      "is_active": true,

      "hifz_daily_logs": [
        {
          "id": 1001,
          "hifz_plan_day_id": 101,
          "actual_start_page": 2,
          "actual_end_page": 3,
          "completed_pages": 2,
          "status": "completed",
          "notes": "Good focus, smooth memorization"
        }
      ]
    }
  ]
}
