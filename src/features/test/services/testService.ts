import { db } from '@/src/lib/db/local-client';
import { testLogs } from '../database/testSchema';
import { sql } from 'drizzle-orm';

export const TestService = {
  async saveResult(data: {
    userId: string;
    planId?: number;
    type: 'HIFZ' | 'MURAJA';
    pagesRange: number[];
    score: number;
    totalQuestions: number;
  }) {
    await db.insert(testLogs).values({
      userId: data.userId,
      planId: data.planId,
      type: data.type,
      pagesRange: JSON.stringify(data.pagesRange),
      score: data.score,
      totalQuestions: data.totalQuestions,
      date: new Date().toISOString(),
    });
  }
};
