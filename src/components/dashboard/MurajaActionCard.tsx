import { useMurajaOperation } from "@/src/features/muraja/hooks/useMurajaOperation";
import { useAlert } from "@/src/hooks/useAlert";
import { Alert } from "../common/Alert";
import { ActionTaskCard } from "../common/ActionCard";
import { useReaderSessionStore } from "@/src/features/quran/store/readerSessionStore";
import { useRouter } from "expo-router";
import { GamificationService } from "@/src/services/GamificationService";
import { useCelebrationStore } from "@/src/hooks/useCelebrationStore";
import { db } from "@/src/lib/db/local-client";
import { useSession } from "@/src/hooks/useSession";
import { userStats } from "@/src/features/user/database/userSchema";
import { eq } from "drizzle-orm";

export const MurajaActionCard = ({
  todayPlan,
  weeklyPlan,
}: {
  todayPlan: any;
  weeklyPlan: any;
}) => {
  const { updateLog, isUpdating } = useMurajaOperation();
  const { alertConfig, hideAlert } = useAlert();
  const session = useReaderSessionStore();
  const router = useRouter();
  const { user } = useSession();
  const trigger = useCelebrationStore(s => s.trigger);

  const isResumable = session.currentPage >= todayPlan.startPage && session.currentPage <= todayPlan.endPage;

  const updateStatus = async (newStatus: "completed" | "pending" | "missed", quality?: number) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const isCompleted = newStatus === "completed";
    const finalStatus = newStatus;
    const duration = quality ? session.getDurationMinutes() : (weeklyPlan.estimated_time_min || 0);
    const pagesViewed = session.pagesViewed;
    const actualEnd = pagesViewed.length > 0 ? Math.max(...pagesViewed) : todayPlan.endPage;
    const actualCount = pagesViewed.length > 0 ? pagesViewed.length : (todayPlan.endPage - todayPlan.startPage + 1);

    try {
      await updateLog({
        plan_id: weeklyPlan?.id,
        date: todayStr,
        start_page: todayPlan.startPage,
        end_page: isCompleted ? actualEnd : todayPlan.startPage,
        completed_pages:
          isCompleted ? actualCount : 0,
        actual_time_min: duration,
        status: finalStatus as any,
        is_catchup: todayPlan.isCatchup ? 1 : 0,
        sync_status: 0,
        remote_id: null,
        quality_score: quality,
      });

      if (isCompleted) {
        const stats = await db.query.userStats.findFirst({
          where: eq(userStats.userId, user?.id!)
        });
        const currentStreak = stats?.murajaCurrentStreak || 0;

        const result = await GamificationService.processSessionCompletion(
          db,
          user?.id!,
          quality!,
          currentStreak + 1
        );

        if (result.rewards.length > 0) {
          trigger(`Mubarak! New Badge: ${result.rewards[0].replace('BADGE_', '')}`, "badge");
        } else if (result.isPerfect) {
          trigger("MashAllah! Perfect Session!", "success");
        } else {
          trigger("Alhamdulillah! Progress Saved", "success");
        }
      }
    } catch (err: any) {
      console.error("Status update failed", err);
    }
  };

  const onStart = () => {
    session.openSession(todayPlan.startPage);
    router.push(`/(app)/quran/reader?page=${todayPlan.startPage}&planId=${weeklyPlan.id}&type=muraja&start=${todayPlan.startPage}&end=${todayPlan.endPage}`);
  };

  const onResume = () => {
    router.push(`/(app)/quran/reader?page=${session.currentPage}&planId=${weeklyPlan.id}&type=muraja&start=${todayPlan.startPage}&end=${todayPlan.endPage}`);
  };

  const title =
    todayPlan.startSurah === todayPlan.endSurah ?
      todayPlan.startSurah
    : `${todayPlan.startSurah} – ${todayPlan.endSurah}`;

  return (
    <>
      <ActionTaskCard
        typeLabel="Muraja'a"
        title={title}
        subTitle={`${todayPlan.isVirtualTask ? "Next Suggested · " : ""}Pages ${todayPlan.startPage} – ${todayPlan.endPage}`}
        isCatchup={todayPlan.isCatchup}
        status={todayPlan.status}
        isLoading={isUpdating}
        onDone={(quality) => updateStatus(todayPlan.status === "completed" ? "pending" : "completed", quality)}
        onStart={onStart}
        onResume={onResume}
        isResumable={isResumable}
        logRoute="/muraja/log"
      />

      <Alert {...alertConfig} onCancel={hideAlert} confirmText="OK" />
    </>
  );
};
