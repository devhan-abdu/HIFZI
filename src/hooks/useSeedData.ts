import { useEffect } from 'react';
import { useSession } from './useSession';
import { runHifzSeedingScenario } from '../features/hifz/utils/seed-hifz-logic';
import { useLoadSurahData } from './useFetchQuran';
import { useQueryClient } from '@tanstack/react-query';

/**
 * DEVELOPMENT ONLY HOOK
 * Automatically seeds the database with a specific scenario on mount.
 * Change the 'scenario' variable to test different lifecycle states.
 */
export function useSeedData() {
  const { user } = useSession();
  const { items: surahData } = useLoadSurahData();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Only run if we have a user and surah data
    if (!user?.id || surahData.length === 0) return;

    // --- CHANGE THIS TO TEST DIFFERENT SCENARIOS ---
    // Scenarios: "both_finished", "hifz_finished", "muraja_finished", "perfect_user", etc.
    const scenario = "both_finished"; 

    async function seed() {
      console.log(`[DevSeed] Starting seed for scenario: ${scenario}`);
      try {
        await runHifzSeedingScenario(user!.id, surahData, scenario as any);
        console.log(`[DevSeed] Seed successful!`);
        
        // Invalidate all queries to refresh the UI with new data
        queryClient.invalidateQueries();
      } catch (err) {
        console.error(`[DevSeed] Seed failed:`, err);
      }
    }

    // Optional: Only run once or based on a specific trigger
    // For now, we'll let it run once on mount for easy testing
    seed();
    
  }, [user?.id, surahData.length]);
}
