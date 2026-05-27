import { db as drizzleDb } from "@/src/lib/db/local-client";
import { pagePerformance, userStats } from "@/src/features/user/database/userSchema";
import { pageActivityLogs } from "@/src/features/habits/database/habitSchema";
import { eq, and, sql, lte, asc, gte } from "drizzle-orm";
import type { HifzPageRange } from "@/src/features/hifz/utils/hifz-page-range";

export type PagePerformance = {
  page_number: number;
  strength: number; 
  last_reviewed_at: string | null;
  next_review_at: string | null;
  stability: number; 
  difficulty: number; 
  consecutive_perfects: number;
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
    qualityScore: number, 
    reviewDate = new Date()
  ): Omit<PagePerformance, "page_number"> {
    let nextStability: number;
    let nextDifficulty: number = current.difficulty;
    let nextConsecutivePerfects = current.consecutive_perfects || 0;

    if (qualityScore >= 5) {
      nextConsecutivePerfects += 1;
    } else if (qualityScore < 4) {
      nextConsecutivePerfects = 0;
    }
   
    nextDifficulty = current.difficulty + (0.1 - (5 - qualityScore) * (0.08 + (5 - qualityScore) * 0.02));
    nextDifficulty = Math.max(1.3, nextDifficulty); 

    if (qualityScore < 3) {
      nextStability = 1;
    } else {
      if (current.stability === 0) {
        nextStability = 5;
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
      consecutive_perfects: nextConsecutivePerfects,
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
        consecutive_perfects: row.consecutivePerfects || 0,
      };
    }

    return {
      page_number: pageNumber,
      strength: 0,
      last_reviewed_at: null,
      next_review_at: null,
      stability: 0,
      difficulty: 2.5, 
      consecutive_perfects: 0,
    };
  },

  async updatePagePerformance(
    db: any,
    userId: string,
    pageNumber: number,
    qualityScore: number,
    reviewDate: Date
  ) {
    const tx = db || drizzleDb;
    const current = await this.getPagePerformance(tx, pageNumber);
    const next = this.calculateNextState(current, qualityScore, reviewDate);
    const lastSessionQuality = qualityScore >= 5 ? 'perfect' : qualityScore <= 2 ? 'low' : 'medium';
    const lastMistakesCount = qualityScore >= 4 ? 0 : (qualityScore === 3 ? 1 : (qualityScore === 2 ? 2 : 4));

    await tx.insert(pagePerformance)
      .values({
        pageNumber,
        userId,
        strength: next.strength,
        lastReviewedAt: next.last_reviewed_at,
        nextReviewAt: next.next_review_at,
        stability: next.stability,
        difficulty: next.difficulty,
        consecutivePerfects: next.consecutive_perfects,
        lastSessionQuality,
        lastMistakesCount,
      })
      .onConflictDoUpdate({
        target: [pagePerformance.userId, pagePerformance.pageNumber],
        set: {
          strength: next.strength,
          lastReviewedAt: next.last_reviewed_at,
          nextReviewAt: next.next_review_at,
          stability: next.stability,
          difficulty: next.difficulty,
          consecutivePerfects: next.consecutive_perfects,
          lastSessionQuality,
          lastMistakesCount,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      });
  },


  async recomputeAllPerformance(tx: any, userId: string) {
    await tx.delete(pagePerformance).where(eq(pagePerformance.userId, userId));
    
    const history = await tx.query.pageActivityLogs.findMany({
      where: eq(pageActivityLogs.userId, userId),
      orderBy: [asc(pageActivityLogs.logDate), asc(pageActivityLogs.id)],
    });

    const stats = await tx.query.userStats.findFirst({
      where: eq(userStats.userId, userId),
    });
    const currentMemorizedPage = stats?.hifzLastPage || 0;

    const lastPerfectDateMap = new Map<number, string>();

    for (const log of history) {
      let score = 3;
      if (log.sessionQuality === 'perfect') score = 5;
      if (log.sessionQuality === 'low') score = 1;

      const current = await this.getPagePerformance(tx, log.pageId);
      
      const isMemorized = log.pageId <= currentMemorizedPage;
      const isHifz = log.source === 'hifz';
      const isMuraja = log.source === 'muraja';

      if (isHifz || isMuraja || isMemorized) {
        let nextConsecutive = current.consecutive_perfects;
        if (score >= 5) {
          const lastDate = lastPerfectDateMap.get(log.pageId);
          const curDate = new Date(log.logDate);
          
          if (!lastDate) {
            nextConsecutive = 1;
            lastPerfectDateMap.set(log.pageId, log.logDate);
          } else {
            const prevDate = new Date(lastDate);
            const diffDays = (curDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays >= 6) { 
               nextConsecutive += 1;
               lastPerfectDateMap.set(log.pageId, log.logDate);
            }
          }
        } else if (score < 4) {
          nextConsecutive = 0;
          lastPerfectDateMap.delete(log.pageId);
        }

        const next = this.calculateNextState(current, score, new Date(log.logDate));
        
        await tx.insert(pagePerformance)
          .values({
            pageNumber: log.pageId,
            userId,
            strength: next.strength,
            lastReviewedAt: next.last_reviewed_at,
            nextReviewAt: next.next_review_at,
            stability: next.stability,
            difficulty: next.difficulty,
            consecutivePerfects: nextConsecutive,
            lastSessionQuality: log.sessionQuality,
            lastMistakesCount: log.mistakesCount,
          })
          .onConflictDoUpdate({
            target: [pagePerformance.userId, pagePerformance.pageNumber],
            set: {
              strength: next.strength,
              lastReviewedAt: next.last_reviewed_at,
              nextReviewAt: next.next_review_at,
              stability: next.stability,
              difficulty: next.difficulty,
              consecutivePerfects: nextConsecutive,
              lastSessionQuality: log.sessionQuality,
              lastMistakesCount: log.mistakesCount,
              updatedAt: sql`CURRENT_TIMESTAMP`,
            },
          });
      } else {
        await tx.insert(pagePerformance)
          .values({
            pageNumber: log.pageId,
            userId,
            strength: 0,
            lastReviewedAt: new Date(log.logDate).toISOString(),
            stability: 0,
            difficulty: 2.5,
            consecutivePerfects: 0,
            lastSessionQuality: log.sessionQuality,
            lastMistakesCount: log.mistakesCount,
          })
          .onConflictDoUpdate({
            target: [pagePerformance.userId, pagePerformance.pageNumber],
            set: {
              lastReviewedAt: new Date(log.logDate).toISOString(),
              lastSessionQuality: log.sessionQuality,
              lastMistakesCount: log.mistakesCount,
              updatedAt: sql`CURRENT_TIMESTAMP`,
            },
          });
      }
    }
  },

  async updateRangePerformance(
    db: any,
    userId: string,
    startPage: number,
    endPage: number,
    qualityScore: number
  ) {
    const pages = [];
    for (let p = startPage; p <= endPage; p++) {
      pages.push(p);
    }
    await this.updatePagesPerformance(db, userId, pages, qualityScore);
  },

  async updatePagesPerformance(
    db: any,
    userId: string,
    pages: number[],
    qualityScore: number
  ) {
    const tx = db || drizzleDb;
    const today = new Date();
    for (const p of pages) {
      await this.updatePagePerformance(tx, userId, p, qualityScore, today);
    }
  },

  async getDuePages(
    db: any,
    userId: string,
    limit = 10,
    hifzRange?: HifzPageRange | null,
  ): Promise<PagePerformance[]> {
    const tx = db || drizzleDb;
    const today = new Date().toISOString();

    const conditions = [
      eq(pagePerformance.userId, userId),
      lte(pagePerformance.nextReviewAt, today),
    ];

    if (hifzRange) {
      conditions.push(gte(pagePerformance.pageNumber, hifzRange.minPage));
      conditions.push(lte(pagePerformance.pageNumber, hifzRange.maxPage));
    }

    const rows = await tx.query.pagePerformance.findMany({
      where: and(...conditions),
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
      consecutive_perfects: r.consecutivePerfects || 0,
    }));
  }
};
