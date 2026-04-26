import { db } from "./local-client";
import { sql } from "drizzle-orm";



export async function initAppDatabase() {
  console.log("[DB] Initializing tables with Drizzle...");
  
  await db.run(sql`PRAGMA journal_mode = WAL;`);

  await db.run(sql`
    -- User & Stats
    CREATE TABLE IF NOT EXISTS user_stats (
      user_id TEXT PRIMARY KEY NOT NULL,
      muraja_last_page INTEGER NOT NULL DEFAULT 0,
      muraja_current_streak INTEGER NOT NULL DEFAULT 0,
      hifz_last_page INTEGER NOT NULL DEFAULT 0,
      hifz_current_streak INTEGER NOT NULL DEFAULT 0,
      global_longest_streak INTEGER NOT NULL DEFAULT 0,
      total_xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 0,
      last_notified_at TEXT,
      last_activity_date TEXT
    );

    -- Hifz feature
    CREATE TABLE IF NOT EXISTS hifz_plans_local (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remote_id TEXT,
      user_id TEXT NOT NULL,
      start_surah INTEGER NOT NULL,
      start_page INTEGER NOT NULL,
      total_pages INTEGER NOT NULL,
      pages_per_day REAL NOT NULL,
      selected_days TEXT NOT NULL,
      days_per_week INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      estimated_end_date TEXT NOT NULL,
      direction TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      sync_status INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_hifz_plans_local_user ON hifz_plans_local(user_id, status);

    CREATE TABLE IF NOT EXISTS hifz_logs_local (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remote_id TEXT,
      user_id TEXT NOT NULL,
      hifz_plan_id INTEGER NOT NULL,
      actual_start_page INTEGER NOT NULL,
      actual_end_page INTEGER NOT NULL,
      actual_pages_completed INTEGER NOT NULL,
      date TEXT NOT NULL,
      log_day INTEGER NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      mistakes_count INTEGER NOT NULL DEFAULT 0,
      hesitation_count INTEGER NOT NULL DEFAULT 0,
      quality_score INTEGER,
      sync_status INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, hifz_plan_id, date)
    );
    CREATE INDEX IF NOT EXISTS idx_hifz_logs_local_plan_date ON hifz_logs_local(hifz_plan_id, date);
    CREATE INDEX IF NOT EXISTS idx_hifz_logs_local_date ON hifz_logs_local(date);

    -- Muraja feature
    CREATE TABLE IF NOT EXISTS weekly_muraja_plan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remote_id TEXT,
      user_id TEXT,
      week_start_date TEXT,
      week_end_date TEXT,
      planned_pages_per_day INTEGER,
      start_page INTEGER,
      end_page INTEGER,
      is_active BOOLEAN DEFAULT 1,
      selected_days TEXT,
      sync_status INTEGER DEFAULT 1,
      estimated_time_min INTEGER,
      place TEXT,
      note TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_weekly_muraja_plan_active_user ON weekly_muraja_plan(user_id, is_active);

    CREATE TABLE IF NOT EXISTS daily_muraja_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remote_id TEXT,
      plan_id INTEGER,
      date TEXT,
      completed_pages INTEGER DEFAULT 0,
      actual_time_min INTEGER DEFAULT 0,
      status TEXT CHECK(status IN ('completed', 'partial', 'missed')),
      is_catchup BOOLEAN DEFAULT 0,
      sync_status INTEGER DEFAULT 0,
      start_page INTEGER,
      mistakes_count INTEGER NOT NULL DEFAULT 0,
      hesitation_count INTEGER NOT NULL DEFAULT 0,
      quality_score INTEGER,
      FOREIGN KEY(plan_id) REFERENCES weekly_muraja_plan(id)
    );
    CREATE INDEX IF NOT EXISTS idx_daily_muraja_logs_plan_date ON daily_muraja_logs(plan_id, date);

    -- Activity & Habits
    CREATE TABLE IF NOT EXISTS quran_activity_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      local_ref_id INTEGER,
      title TEXT,
      start_date TEXT,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      metadata TEXT,
      remote_id TEXT,
      is_synced INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_quran_activity_plans_user_type ON quran_activity_plans(user_id, activity_type, status);

    CREATE TABLE IF NOT EXISTS quran_activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      plan_id INTEGER,
      local_ref_id INTEGER,
      minutes_spent INTEGER NOT NULL DEFAULT 0,
      units_completed INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      metadata TEXT,
      remote_id TEXT,
      is_synced INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(plan_id) REFERENCES quran_activity_plans(id)
    );
    CREATE INDEX IF NOT EXISTS idx_quran_activity_logs_user_date ON quran_activity_logs(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_quran_activity_logs_type ON quran_activity_logs(user_id, activity_type, date);

    -- Quran State (Bookmarks, Downloads)
    CREATE TABLE IF NOT EXISTS bookmarks_local (
      local_id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      user_id TEXT NOT NULL,
      verse_key TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      sync_error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_bookmarks_local_user_page ON bookmarks_local(user_id, page_number);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_local_user_verse ON bookmarks_local(user_id, verse_key);
  `);


  console.log("[DB] Drizzle initialization complete");
}
