import React, { useState } from "react";
import { useMurajaOperation } from "@/src/features/muraja/hooks/useMurajaOperation";
import { useAlert } from "@/src/hooks/useAlert";
import { useNavigate } from "@/src/hooks/useNavigate";
import { useCelebrationStore } from "@/src/hooks/useCelebrationStore";
import { ActionTaskCard } from "@/src/components/common/ActionCard";
import { QualityModal } from "@/src/components/common/QualityModal";
import { Alert } from "@/src/components/common/Alert";
import { getLocalDateString } from "@/src/features/muraja/utils/murajaAnalytics";

export const MurajaActionCard = ({
  todayPlan,
  weeklyPlan,
  onDetails,
}: {
  todayPlan: any;
  weeklyPlan: any;
  onDetails: () => void;
}) => {
  const { updateLog, isUpdating } = useMurajaOperation();
  const { alertConfig, hideAlert } = useAlert();
  const trigger = useCelebrationStore(s => s.trigger);
  const [qualityModalVisible, setQualityModalVisible] = useState(false);
  const { push } = useNavigate();


  const updateStatus = async (newStatus: "completed" | "pending" | "missed", quality?: number) => {
    const todayStr = getLocalDateString(new Date());
    const isCompleted = newStatus === "completed";
    const duration = weeklyPlan.estimated_time_min || 0;
    const actualEnd = todayPlan.endPage;
    const actualCount = (todayPlan.endPage - todayPlan.startPage + 1);

    try {
      const result = await updateLog({
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

      if (isCompleted && result?.rewards) {
        const rewards = result.rewards;
        if (rewards.rewards.length > 0) {
          trigger(`Mubarak! New Badge: ${rewards.rewards[0].replace('BADGE_', '')}`, "badge");
        } else if (rewards.isPerfect) {
          trigger("MashAllah! Perfect Session!", "success");
        } else {
          trigger("Alhamdulillah! Progress Saved", "success");
        }
      }
    } catch (err: any) {
      console.error("Status update failed", err);
    }
  };

  const planTargetEnd = todayPlan.quotaEnd ?? todayPlan.endPage;
  const actualEnd = todayPlan.endPage;
  const planTargetStart = todayPlan.startPage;
  const plannedCount = planTargetEnd - planTargetStart + 1;

  const currentStatus = todayPlan?.status || "pending";
  const isCompleted = currentStatus === "completed";
  const isPartial = currentStatus === "partial";

  const subTitle = isPartial
    ? `${todayPlan.completedPages} / ${plannedCount} pages · ${planTargetStart}–${planTargetEnd}`
    : isCompleted && todayPlan.completedPages > 0
    ? `${todayPlan.completedPages} pages done · ${planTargetStart}–${actualEnd}`
    : `${todayPlan.isVirtualTask ? "Next Suggested · " : ""}Pages ${planTargetStart}–${planTargetEnd}`;

  const title =
    todayPlan.startSurah === todayPlan.endSurah
      ? todayPlan.startSurah
      : `${todayPlan.startSurah} – ${todayPlan.endSurah}`;

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
        onStart={() => {
          push(`/(app)/quran/reader?page=${todayPlan.startPage}&planId=${weeklyPlan.id}&type=muraja&start=${todayPlan.startPage}&end=${todayPlan.endPage}`);
        }}
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

