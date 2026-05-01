import { db } from '@/src/lib/db/local-client';
import { pageActivityLogs } from '@/src/features/habits/database/habitSchema';
import { eq, and, desc, sql } from 'drizzle-orm';

export type PageStatus = 'not_started' | 'weak' | 'partial' | 'strong' | 'mastered';

export interface IPageActivity {
  id?: number;
  userId: string;
  pageId: number;
  source: 'hifz' | 'muraja';
  sessionQuality: 'perfect' | 'medium' | 'low';
  mistakesCount?: number;
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
  /**
   * Phase 1 & 5: Log activity for a specific page
   */
  async logPageActivity(activity: IPageActivity) {
    await db.insert(pageActivityLogs).values({
      userId: activity.userId,
      pageId: activity.pageId,
      source: activity.source,
      sessionQuality: activity.sessionQuality,
      mistakesCount: activity.mistakesCount ?? 0,
    });
    console.log(`[PageMastery] Logged ${activity.source} activity for page ${activity.pageId}`);
  },

  /**
   * Log activity for a range of pages (useful for Muraja)
   */
  async logPageRangeActivity(userId: string, startPage: number, endPage: number, source: 'hifz' | 'muraja', quality: 'perfect' | 'medium' | 'low', mistakesPerPage: number = 0) {
    const logs = [];
    for (let p = startPage; p <= endPage; p++) {
      logs.push({
        userId,
        pageId: p,
        source,
        sessionQuality: quality,
        mistakesCount: mistakesPerPage,
      });
    }
    if (logs.length > 0) {
      await db.insert(pageActivityLogs).values(logs);
    }
    console.log(`[PageMastery] Logged ${source} range activity for pages ${startPage}-${endPage}`);
  },

  /**
   * Phase 2 & 3: Calculate the mastery status for a single page
   */
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

    // Rule: Weak (Red)
    if (latest.sessionQuality === 'low' || (latest.mistakesCount ?? 0) >= 4) {
      return {
        pageId,
        status: 'weak',
        lastActivityAt: latest.createdAt,
        lastSessionQuality: latest.sessionQuality,
        totalSessions: history.length,
      };
    }

    // Rule: Gold (Mastered)
    // 3 perfect sessions in different weeks (at least 7 days apart)
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

    // Rule: Green (Strong)
    if (latest.sessionQuality === 'perfect' && daysSinceLast <= 7) {
      return {
        pageId,
        status: 'strong',
        lastActivityAt: latest.createdAt,
        lastSessionQuality: latest.sessionQuality,
        totalSessions: history.length,
      };
    }

    // Rule: Orange (Partial)
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

  /**
   * Phase 4: Get full heatmap data for all pages
   */
  async getHeatmapData(userId: string): Promise<Record<number, IPageMasteryInfo>> {
    const allLogs = await db.query.pageActivityLogs.findMany({
      where: eq(pageActivityLogs.userId, userId),
      orderBy: [desc(pageActivityLogs.createdAt)],
    });

    const heatmap: Record<number, IPageMasteryInfo> = {};
    const pageGroups: Record<number, any[]> = {};

    allLogs.forEach(log => {
      if (!pageGroups[log.pageId]) pageGroups[log.pageId] = [];
      pageGroups[log.pageId].push(log);
    });

    for (const pageIdStr in pageGroups) {
      const pageId = parseInt(pageIdStr);
      const history = pageGroups[pageId];
      const latest = history[0];
      const lastActivityDate = new Date(latest.createdAt);
      const now = new Date();
      const daysSinceLast = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));

      let status: PageStatus = 'partial';

      if (latest.sessionQuality === 'low' || (latest.mistakesCount ?? 0) >= 4) {
        status = 'weak';
      } else {
        const perfectSessions = history.filter(h => h.sessionQuality === 'perfect');
        let isMastered = false;
        if (perfectSessions.length >= 3) {
          let distinctWeeks = 1;
          let lastRefDate = new Date(perfectSessions[0].createdAt);
          for (let i = 1; i < perfectSessions.length; i++) {
            const curDate = new Date(perfectSessions[i].createdAt);
            if (Math.abs((lastRefDate.getTime() - curDate.getTime()) / (1000 * 60 * 60 * 24)) >= 7) {
              distinctWeeks++;
              lastRefDate = curDate;
            }
          }
          if (distinctWeeks >= 3) isMastered = true;
        }

        if (isMastered) {
          status = 'mastered';
        } else if (latest.sessionQuality === 'perfect' && daysSinceLast <= 7) {
          status = 'strong';
        } else if (latest.sessionQuality === 'medium' || daysSinceLast > 14) {
          status = 'partial';
        }
      }

      heatmap[pageId] = {
        pageId,
        status,
        lastActivityAt: latest.createdAt,
        lastSessionQuality: latest.sessionQuality,
        totalSessions: history.length,
      };
    }

    return heatmap;
  }
};
