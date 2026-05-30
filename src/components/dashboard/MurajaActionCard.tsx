import React, { useState } from "react";
import { useMurajaOperation } from "@/src/features/muraja/hooks/useMurajaOperation";
import { useAlert } from "@/src/hooks/useAlert";
import { Alert } from "../common/Alert";
import { ActionTaskCard } from "../common/ActionCard";
import { QualityModal } from "../common/QualityModal";
import { useNavigate } from "@/src/hooks/useNavigate";
import { useCelebrationStore } from "@/src/hooks/useCelebrationStore";

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
    const todayStr = new Date().toISOString().slice(0, 10);
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

  const isPartial = todayPlan.status === "partial";

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

