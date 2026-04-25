import { SQLiteDatabase } from "expo-sqlite";

export type PagePerformance = {
  page_number: number;
  strength: number; // 0.0 to 1.0
  last_reviewed_at: string | null;
  next_review_at: string | null;
  stability: number; // Interval in days
  difficulty: number; // Easiness factor
};

export const PerformanceService = {
  async ensurePerformanceTables(db: SQLiteDatabase) {
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
    `);
  },

  /**
   * Derives a 0-5 quality score from mistakes and hesitations.
   */
  deriveQualityScore(mistakes: number, hesitations: number): number {
    if (mistakes === 0 && hesitations === 0) return 5;
    if (mistakes === 0 && hesitations <= 2) return 4;
    if (mistakes <= 1 && hesitations <= 4) return 3;
    if (mistakes <= 2) return 2;
    if (mistakes <= 3) return 1;
    return 0;
  },

  /**
   * Calculates the new performance state based on a review session.
   * Uses a simplified SM-2 inspired algorithm.
   */
  calculateNextState(
    current: PagePerformance,
    qualityScore: number, // 0 to 5
    reviewDate = new Date()
  ): Omit<PagePerformance, "page_number"> {
    let nextStability: number;
    let nextDifficulty: number = current.difficulty;

    // Adjust difficulty based on quality score (SM-2 standard formula variant)
    // EF' = f(EF, q) = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    nextDifficulty = current.difficulty + (0.1 - (5 - qualityScore) * (0.08 + (5 - qualityScore) * 0.02));
    nextDifficulty = Math.max(1.3, nextDifficulty); // Minimum difficulty

    if (qualityScore < 3) {
      // Failed review: reset stability but keep a fraction of it for recovery
      nextStability = 1;
    } else {
      // Successful review: expand stability
      if (current.stability === 0) {
        nextStability = 1;
      } else if (current.stability === 1) {
        nextStability = 6;
      } else {
        nextStability = Math.round(current.stability * nextDifficulty);
      }
    }

    // Strength is a normalized representation of stability vs max intended stability (e.g. 365 days)
    const strength = Math.min(1.0, nextStability / 180); 

    const lastReviewedAt = reviewDate.toISOString();
    const nextReviewDate = new Date(reviewDate.getTime() + nextStability * 24 * 60 * 60 * 1000);

    return {
      strength,
      last_reviewed_at: lastReviewedAt,
      next_review_at: nextReviewDate.toISOString(),
      stability: nextStability,
      difficulty: nextDifficulty,
    };
  },

  async getPagePerformance(db: SQLiteDatabase, pageNumber: number): Promise<PagePerformance> {
    await this.ensurePerformanceTables(db);
    const row = await db.getFirstAsync<PagePerformance>(
      "SELECT * FROM page_performance WHERE page_number = ?",
      [pageNumber]
    );

    if (row) return row;

    // Default state for a new page
    return {
      page_number: pageNumber,
      strength: 0,
      last_reviewed_at: null,
      next_review_at: null,
      stability: 0,
      difficulty: 2.5, // Standard starting difficulty
    };
  },

  async updatePagePerformance(
    db: SQLiteDatabase,
    pageNumber: number,
    qualityScore: number
  ) {
    await this.ensurePerformanceTables(db);
    const current = await this.getPagePerformance(db, pageNumber);
    const next = this.calculateNextState(current, qualityScore);

    await db.runAsync(
      `
      INSERT INTO page_performance (
        page_number, strength, last_reviewed_at, next_review_at, stability, difficulty, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(page_number) DO UPDATE SET
        strength = excluded.strength,
        last_reviewed_at = excluded.last_reviewed_at,
        next_review_at = excluded.next_review_at,
        stability = excluded.stability,
        difficulty = excluded.difficulty,
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        pageNumber,
        next.strength,
        next.last_reviewed_at,
        next.next_review_at,
        next.stability,
        next.difficulty,
      ]
    );
  },

  /**
   * Batch update for a range of pages (e.g. daily session)
   */
  async updateRangePerformance(
    db: SQLiteDatabase,
    startPage: number,
    endPage: number,
    qualityScore: number
  ) {
    for (let p = startPage; p <= endPage; p++) {
      await this.updatePagePerformance(db, p, qualityScore);
    }
  },

  async getDuePages(db: SQLiteDatabase, limit = 10): Promise<PagePerformance[]> {
    const today = new Date().toISOString();
    return db.getAllAsync<PagePerformance>(
      `
      SELECT * FROM page_performance
      WHERE next_review_at <= ?
      ORDER BY next_review_at ASC, strength ASC
      LIMIT ?
      `,
      [today, limit]
    );
  }
};
