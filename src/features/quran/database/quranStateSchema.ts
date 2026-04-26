import { sqliteTable, text, integer, index, uniqueIndex, real, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const bookmarksLocal = sqliteTable('bookmarks_local', {
  localId: text('local_id').primaryKey(),
  remoteId: text('remote_id'),
  userId: text('user_id').notNull(),
  verseKey: text('verse_key').notNull(),
  pageNumber: integer('page_number').notNull(),
  syncStatus: text('sync_status').notNull().default('pending'),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at'),
  syncError: text('sync_error'),
}, (table) => ({
  userPageIdx: index('idx_bookmarks_local_user_page').on(table.userId, table.pageNumber),
  userVerseIdx: uniqueIndex('idx_bookmarks_local_user_verse').on(table.userId, table.verseKey),
}));

export const quranPackages = sqliteTable('quran_packages', {
  packageKey: text('package_key').primaryKey(),
  packageType: text('package_type').notNull(),
  version: text('version'),
  status: text('status').notNull().default('idle'),
  progress: real('progress').notNull().default(0),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const quranDownloadJobs = sqliteTable('quran_download_jobs', {
  jobId: text('job_id').primaryKey(),
  jobType: text('job_type').notNull(),
  resourceId: text('resource_id').notNull(),
  resourceScope: text('resource_scope'),
  status: text('status').notNull().default('queued'),
  priority: integer('priority').notNull().default(0),
  progress: real('progress').notNull().default(0),
  bytesDownloaded: integer('bytes_downloaded').notNull().default(0),
  totalBytes: integer('total_bytes'),
  localUri: text('local_uri'),
  resumeData: text('resume_data'),
  errorMessage: text('error_message'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  statusPriorityIdx: index('idx_quran_download_jobs_status_priority').on(table.status, table.priority, table.createdAt),
}));

export const translationResources = sqliteTable('translation_resources', {
  translationId: integer('translation_id').primaryKey(),
  language: text('language'),
  name: text('name').notNull(),
  version: text('version'),
  downloaded: integer('downloaded').notNull().default(0),
  localPath: text('local_path'),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const audioManifests = sqliteTable('audio_manifests', {
  reciterId: integer('reciter_id').notNull(),
  surahId: integer('surah_id').notNull(),
  localUri: text('local_uri'),
  status: text('status').notNull().default('idle'),
  bytesDownloaded: integer('bytes_downloaded').notNull().default(0),
  totalBytes: integer('total_bytes'),
  resumeData: text('resume_data'),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.reciterId, table.surahId] }),
}));

export const quranSyncState = sqliteTable('quran_sync_state', {
  key: text('key').primaryKey(),
  value: text('value'),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
