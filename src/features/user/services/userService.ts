import { eq } from 'drizzle-orm';
import { db } from '@/src/lib/db/local-client';
import { userStats } from '../database/userSchema';

export const userService = {
  async getUserStats(userId: string) {
    if (!userId) return null;
    
    return await db.query.userStats.findFirst({
      where: eq(userStats.userId, userId),
    });
  },
  
  async updateXp(userId: string, amount: number) {
    // This will be used by the Gamification service later
  }
};
