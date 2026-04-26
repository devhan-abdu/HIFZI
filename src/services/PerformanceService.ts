import { db as drizzleDb } from "@/src/lib/db/local-client";
import { pagePerformance } from "@/src/features/user/database/userSchema";
import { eq, and, sql, lte } from "drizzle-orm";

export type PagePerformance = {
  page_number: number;
  strength: number; 
  last_reviewed_at: string | null;
  next_review_at: string | null;
  stability: number; 
  difficulty: number; 
};

export const PerformanceService = {

  deriveQualityScore(mistakes: number, hesitations: number): number {
    if (mistakes === 0 && hesitations === 0) return 5;
    if (mistakes === 0 && hesitations <= 2) return 4;
    if (mistakes <= 1 && hesitations <= 4) return 3;
    if (mistakes <= 2) return 2;
    if (mistakes <= 3) return 1;
    return 0;
  },


  calculateNextState(
    current: PagePerformance,
    qualityScore: number, // 0 to 5
    reviewDate = new Date()
  ): Omit<PagePerformance, "page_number"> {
    let nextStability: number;
    let nextDifficulty: number = current.difficulty;

   
    nextDifficulty = current.difficulty + (0.1 - (5 - qualityScore) * (0.08 + (5 - qualityScore) * 0.02));
    nextDifficulty = Math.max(1.3, nextDifficulty); 

    if (qualityScore < 3) {
      nextStability = 1;
    } else {
      if (current.stability === 0) {
        nextStability = 1;
      } else if (current.stability === 1) {
        nextStability = 6;
      } else {
        nextStability = Math.round(current.stability * nextDifficulty);
      }
    }

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

  async getPagePerformance(db: any, pageNumber: number): Promise<PagePerformance> {
    const tx = db || drizzleDb;
    const row = await tx.query.pagePerformance.findFirst({
      where: eq(pagePerformance.pageNumber, pageNumber),
    });

    if (row) {
      return {
        page_number: row.pageNumber,
        strength: row.strength,
        last_reviewed_at: row.lastReviewedAt,
        next_review_at: row.nextReviewAt,
        stability: row.stability,
        difficulty: row.difficulty,
      };
    }

    return {
      page_number: pageNumber,
      strength: 0,
      last_reviewed_at: null,
      next_review_at: null,
      stability: 0,
      difficulty: 2.5, 
    };
  },

  async updatePagePerformance(
    db: any,
    pageNumber: number,
    qualityScore: number
  ) {
    const tx = db || drizzleDb;
    const current = await this.getPagePerformance(tx, pageNumber);
    const next = this.calculateNextState(current, qualityScore);

    await tx.insert(pagePerformance)
      .values({
        pageNumber,
        strength: next.strength,
        lastReviewedAt: next.last_reviewed_at,
        nextReviewAt: next.next_review_at,
        stability: next.stability,
        difficulty: next.difficulty,
      })
      .onConflictDoUpdate({
        target: pagePerformance.pageNumber,
        set: {
          strength: next.strength,
          lastReviewedAt: next.last_reviewed_at,
          nextReviewAt: next.next_review_at,
          stability: next.stability,
          difficulty: next.difficulty,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      });
  },

 
  async updateRangePerformance(
    db: any,
    startPage: number,
    endPage: number,
    qualityScore: number
  ) {
    const tx = db || drizzleDb;
    for (let p = startPage; p <= endPage; p++) {
      await this.updatePagePerformance(tx, p, qualityScore);
    }
  },

  async getDuePages(db: any, limit = 10): Promise<PagePerformance[]> {
    const tx = db || drizzleDb;
    const today = new Date().toISOString();
    const rows = await tx.query.pagePerformance.findMany({
      where: lte(pagePerformance.nextReviewAt, today),
      orderBy: [pagePerformance.nextReviewAt, pagePerformance.strength],
      limit,
    });

    return rows.map((r: any) => ({
      page_number: r.pageNumber,
      strength: r.strength,
      last_reviewed_at: r.lastReviewedAt,
      next_review_at: r.nextReviewAt,
      stability: r.stability,
      difficulty: r.difficulty,
    }));
  }
};
