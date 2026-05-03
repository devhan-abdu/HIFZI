import { db } from '@/src/lib/db/local-client';
import { pageActivityLogs } from '@/src/features/habits/database/habitSchema';
import { pagePerformance } from '@/src/features/user/database/userSchema';
import { eq, and, desc, sql } from 'drizzle-orm';

export type PageStatus = 'not_started' | 'weak' | 'partial' | 'strong' | 'mastered';

export interface IPageActivity {
  id?: number;
  userId: string;
  pageId: number;
  source: 'hifz' | 'muraja';
  localLogId: number;
  logDate: string;
  sessionQuality: 'perfect' | 'medium' | 'low';
  mistakesCount?: number;
  hesitationsCount?: number;
  createdAt?: string;
}

export interface IPageMasteryInfo {
  pageId: number;
  status: PageStatus;
  lastActivityAt: string | null;
  lastSessionQuality: string | null;
  totalSessions: number;
}

export const PageMasteryService = {

  async logPageActivity(activity: IPageActivity) {
    await db.insert(pageActivityLogs).values({
      userId: activity.userId,
      pageId: activity.pageId,
      source: activity.source,
      localLogId: activity.localLogId,
      logDate: activity.logDate,
      sessionQuality: activity.sessionQuality,
      mistakesCount: activity.mistakesCount ?? 0,
    });
  },

  async logPageRangeActivity(
    tx: any,
    userId: string, 
    localLogId: number,
    logDate: string,
    startPage: number, 
    endPage: number, 
    source: 'hifz' | 'muraja', 
    quality: 'perfect' | 'medium' | 'low', 
    mistakesPerPage: number = 0,
    hesitationsPerPage: number = 0
  ) {
    const logs = [];
    for (let p = startPage; p <= endPage; p++) {
      logs.push({
        userId,
        pageId: p,
        source,
        localLogId,
        logDate,
        sessionQuality: quality,
        mistakesCount: mistakesPerPage,
        hesitationsCount: hesitationsPerPage,
      });
    }
    if (logs.length > 0) {
      await tx.insert(pageActivityLogs).values(logs);
    }
  },

  
  async syncPageActivityLogs(
    tx: any,
    userId: string,
    source: 'hifz' | 'muraja',
    localLogId: number,
    logDate: string,
    range: { start: number; end: number } | null,
    quality: 'perfect' | 'medium' | 'low',
    mistakes: number = 0,
    hesitations: number = 0
  ) {
    await tx.delete(pageActivityLogs).where(and(
      eq(pageActivityLogs.userId, userId),
      eq(pageActivityLogs.source, source),
      eq(pageActivityLogs.localLogId, localLogId)
    ));

    if (range && range.start > 0 && range.end >= range.start) {
      const pageCount = Math.max(1, range.end - range.start + 1);
      const mistakesPerPage = Math.ceil(mistakes / pageCount);
      const hesitationsPerPage = Math.ceil(hesitations / pageCount);
      await this.logPageRangeActivity(tx, userId, localLogId, logDate, range.start, range.end, source, quality, mistakesPerPage, hesitationsPerPage);
    }
  },


  async getPageStatus(userId: string, pageId: number): Promise<IPageMasteryInfo> {
    const history = await db.query.pageActivityLogs.findMany({
      where: and(eq(pageActivityLogs.userId, userId), eq(pageActivityLogs.pageId, pageId)),
      orderBy: [desc(pageActivityLogs.createdAt)],
    });

    if (history.length === 0) {
      return {
        pageId,
        status: 'not_started',
        lastActivityAt: null,
        lastSessionQuality: null,
        totalSessions: 0,
      };
    }

    const latest = history[0];
    const lastActivityDate = new Date(latest.createdAt);
    const now = new Date();
    const daysSinceLast = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));

    if (latest.sessionQuality === 'low' || (latest.mistakesCount ?? 0) >= 4) {
      return {
        pageId,
        status: 'weak',
        lastActivityAt: latest.createdAt,
        lastSessionQuality: latest.sessionQuality,
        totalSessions: history.length,
      };
    }

  
    const perfectSessions = history.filter(h => h.sessionQuality === 'perfect');
    if (perfectSessions.length >= 3) {
      let distinctWeeks = 1;
      let lastPerfectDate = new Date(perfectSessions[0].createdAt);
      
      for (let i = 1; i < perfectSessions.length; i++) {
        const currentDate = new Date(perfectSessions[i].createdAt);
        const diffDays = Math.abs((lastPerfectDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 7) {
          distinctWeeks++;
          lastPerfectDate = currentDate;
        }
        if (distinctWeeks >= 3) break;
      }

      if (distinctWeeks >= 3) {
        return {
          pageId,
          status: 'mastered',
          lastActivityAt: latest.createdAt,
          lastSessionQuality: latest.sessionQuality,
          totalSessions: history.length,
        };
      }
    }

    if (latest.sessionQuality === 'perfect' && daysSinceLast <= 7) {
      return {
        pageId,
        status: 'strong',
        lastActivityAt: latest.createdAt,
        lastSessionQuality: latest.sessionQuality,
        totalSessions: history.length,
      };
    }

    if (latest.sessionQuality === 'medium' || daysSinceLast > 14) {
      return {
        pageId,
        status: 'partial',
        lastActivityAt: latest.createdAt,
        lastSessionQuality: latest.sessionQuality,
        totalSessions: history.length,
      };
    }

    return {
      pageId,
      status: 'partial',
      lastActivityAt: latest.createdAt,
      lastSessionQuality: latest.sessionQuality,
      totalSessions: history.length,
    };
  },


  async getHeatmapData(userId: string): Promise<Record<number, IPageMasteryInfo>> {
    const performances = await db.query.pagePerformance.findMany({
      where: eq(pagePerformance.userId, userId),
    });

    const heatmap: Record<number, IPageMasteryInfo> = {};

    for (const p of performances) {
      let status: PageStatus = 'not_started';
      
      if (p.stability < 2) {
        status = 'weak';
      } else if (p.stability < 7) {
        status = 'partial';
      } else if (p.stability < 30) {
        status = 'strong';
      } else {
        status = (p.consecutivePerfects || 0) >= 3 ? 'mastered' : 'strong';
      }

      heatmap[p.pageNumber] = {
        pageId: p.pageNumber,
        status,
        lastActivityAt: p.lastReviewedAt,
        lastSessionQuality: p.lastSessionQuality,
        totalSessions: 0, 
      };
    }

    return heatmap;
  }
};
