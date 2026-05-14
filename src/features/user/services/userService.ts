import { eq } from 'drizzle-orm';
import { getStateDb } from '@/src/lib/db/local-client';
import { userStats, userBadges } from '../database/userSchema';
import { GamificationService } from '@/src/services/GamificationService';

export const userService = {
  async getUserStats(userId: string) {
    if (!userId) return null;
    
    const stats = await getStateDb().query.userStats.findFirst({
      where: eq(userStats.userId, userId),
    });
    return stats ?? null;
  },

  async getUserBadges(userId: string) {
    if (!userId) return [];
    
    return await getStateDb().query.userBadges.findMany({
      where: eq(userBadges.userId, userId),
      orderBy: (badges, { desc }) => [desc(badges.achievedAt)],
    });
  },
  
  async updateXp(userId: string, amount: number) {
    if (!userId) return;
    await GamificationService.awardXP(getStateDb() as any, userId, amount);
  }
};
