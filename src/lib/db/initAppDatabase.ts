import { SQLiteDatabase } from "expo-sqlite";
import { initHabitTables } from "@/src/features/habit/services/habitService";
import { initHabitProgressTables } from "@/src/features/habits/services/habitProgressService";
import { ensureMurajaTables } from "@/src/features/muraja/services/localMurajaService";
import { ensureHifzTables } from "@/src/features/hifz/services/hifz";
import { initNotificationTables } from "@/src/services/notificationService";

async function ensureColumn(
  db: SQLiteDatabase,
  table: string,
  column: string,
  definition: string,
) {
  try {
    const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
    const exists = columns.some((item) => item.name === column);
    
    if (!exists) {
      console.log(`[DB] Migration: Adding ${column} to ${table}...`);
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      console.log(`[DB] Migration: ${column} added to ${table} successfully.`);
    } else {
      // console.log(`[DB] Migration: ${column} already exists in ${table}.`);
    }
  } catch (err) {
    console.error(`[DB] Migration Error on ${table}.${column}:`, err);
  }
}

async function initQuranStateTables(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

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
    CREATE INDEX IF NOT EXISTS idx_bookmarks_local_user_page
      ON bookmarks_local(user_id, page_number);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_local_user_verse
      ON bookmarks_local(user_id, verse_key);

    CREATE TABLE IF NOT EXISTS quran_packages (
      package_key TEXT PRIMARY KEY NOT NULL,
      package_type TEXT NOT NULL,
      version TEXT,
      status TEXT NOT NULL DEFAULT 'idle',
      progress REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quran_download_jobs (
      job_id TEXT PRIMARY KEY NOT NULL,
      job_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      resource_scope TEXT,
      status TEXT NOT NULL DEFAULT 'queued',
      priority INTEGER NOT NULL DEFAULT 0,
      progress REAL NOT NULL DEFAULT 0,
      bytes_downloaded INTEGER NOT NULL DEFAULT 0,
      total_bytes INTEGER,
      local_uri TEXT,
      resume_data TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_quran_download_jobs_status_priority
      ON quran_download_jobs(status, priority DESC, created_at ASC);

    CREATE TABLE IF NOT EXISTS translation_resources (
      translation_id INTEGER PRIMARY KEY NOT NULL,
      language TEXT,
      name TEXT NOT NULL,
      version TEXT,
      downloaded INTEGER NOT NULL DEFAULT 0,
      local_path TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audio_manifests (
      reciter_id INTEGER NOT NULL,
      surah_id INTEGER NOT NULL,
      local_uri TEXT,
      status TEXT NOT NULL DEFAULT 'idle',
      bytes_downloaded INTEGER NOT NULL DEFAULT 0,
      total_bytes INTEGER,
      resume_data TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (reciter_id, surah_id)
    );

    CREATE TABLE IF NOT EXISTS quran_sync_state (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await ensureColumn(db, "bookmarks_local", "deleted_at", "TEXT");
  await ensureColumn(db, "bookmarks_local", "sync_error", "TEXT");
}

async function initPerformanceTables(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS page_performance (
      page_number INTEGER PRIMARY KEY NOT NULL,
      strength REAL NOT NULL DEFAULT 0.0,
      last_reviewed_at TEXT,
      next_review_at TEXT,
      stability REAL NOT NULL DEFAULT 1.0,
      difficulty REAL NOT NULL DEFAULT 1.0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_badges (
      badge_id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      badge_type TEXT NOT NULL,
      achieved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT
    );
  `);
}

export async function initAppDatabase(db: SQLiteDatabase) {
  console.log("[DB] Initializing tables...");
  await initQuranStateTables(db);
  await initHabitTables(db);
  await initHabitProgressTables(db);
  await ensureMurajaTables(db);
  await ensureHifzTables(db);
  await initNotificationTables(db);
  await initPerformanceTables(db);

  // Quality Tracking Columns
  await ensureColumn(db, "daily_muraja_logs", "mistakes_count", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "daily_muraja_logs", "hesitation_count", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "daily_muraja_logs", "quality_score", "INTEGER");

  await ensureColumn(db, "hifz_logs_local", "mistakes_count", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "hifz_logs_local", "hesitation_count", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "hifz_logs_local", "quality_score", "INTEGER");

  // Essential columns for Muraja and Gamification
  await ensureColumn(db, "user_stats", "muraja_last_page", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "user_stats", "muraja_current_streak", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "user_stats", "total_xp", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "user_stats", "level", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "user_stats", "last_notified_at", "TEXT");
  await ensureColumn(db, "user_stats", "last_activity_date", "TEXT");
  console.log("[DB] Tables initialized successfully");
}
