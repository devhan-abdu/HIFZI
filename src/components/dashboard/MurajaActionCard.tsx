import React, { useState } from "react";
import { useMurajaOperation } from "@/src/features/muraja/hooks/useMurajaOperation";
import { useAlert } from "@/src/hooks/useAlert";
import { Alert } from "../common/Alert";
import { ActionTaskCard } from "../common/ActionCard";
import { QualityModal } from "../common/QualityModal";
import { useReaderSessionStore } from "@/src/features/quran/store/readerSessionStore";

import { GamificationService } from "@/src/services/GamificationService";
import { useCelebrationStore } from "@/src/hooks/useCelebrationStore";
import { db } from "@/src/lib/db/local-client";
import { useSession } from "@/src/hooks/useSession";
import { userStats } from "@/src/features/user/database/userSchema";
import { eq } from "drizzle-orm";

export const MurajaActionCard = ({
  todayPlan,
  weeklyPlan,
  onStart,
  onResume,
  onDetails,
}: {
  todayPlan: any;
  weeklyPlan: any;
  onStart: () => void;
  onResume: () => void;
  onDetails: () => void;
}) => {
  const { updateLog, isUpdating } = useMurajaOperation();
  const { alertConfig, hideAlert } = useAlert();
  const session = useReaderSessionStore();
  const { user } = useSession();
  const trigger = useCelebrationStore(s => s.trigger);
  const [qualityModalVisible, setQualityModalVisible] = useState(false);


  const updateStatus = async (newStatus: "completed" | "pending" | "missed", quality?: number) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const isCompleted = newStatus === "completed";
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
        completed_pages: isCompleted ? actualCount : 0,
        actual_time_min: duration,
        status: newStatus as any,
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

  const isPartial = todayPlan.status === "partial";
  const isResumable = isPartial || (session.currentPage >= todayPlan.startPage && session.currentPage <= todayPlan.endPage);

  const subTitle = todayPlan.status === "partial" 
    ? `${todayPlan.completedPages} pages done · ${todayPlan.startPage} – ${todayPlan.endPage}`
    : `${todayPlan.isVirtualTask ? "Next Suggested · " : ""}Pages ${todayPlan.startPage} – ${todayPlan.endPage}`;

  const title =
    todayPlan.startSurah === todayPlan.endSurah ?
      todayPlan.startSurah
    : `${todayPlan.startSurah} – ${todayPlan.endSurah}`;

  const currentStatus = todayPlan?.status || "pending";
  const isCompleted = currentStatus === "completed";

  return (
    <>
      <ActionTaskCard
        typeLabel="Muraja'a"
        title={title}
        subTitle={subTitle}
        isCatchup={todayPlan.isCatchup}
        status={currentStatus as any}
        isLoading={isUpdating}
        onDone={() => {
          if (isCompleted) {
            updateStatus("pending");
          } else {
            setQualityModalVisible(true);
          }
        }}
        onStart={onStart}
        onResume={onResume}
        isResumable={isResumable}
        onDetails={onDetails}
      />

      <QualityModal
        visible={qualityModalVisible}
        onClose={() => setQualityModalVisible(false)}
        onSelect={(score) => {
          setQualityModalVisible(false);
          updateStatus("completed", score);
        }}
        title="Rate your Muraja session"
      />

      <Alert {...alertConfig} onCancel={hideAlert} confirmText="OK" />
    </>
  );
};

