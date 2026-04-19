import { useMurajaOperation } from "@/src/features/muraja/hooks/useMurajaOperation";
import { useAlert } from "@/src/hooks/useAlert";
import { Alert } from "../common/Alert";
import { ActionTaskCard } from "../common/ActionCard";

export const MurajaActionCard = ({
  todayPlan,
  weeklyPlan,
}: {
  todayPlan: any;
  weeklyPlan: any;
}) => {
  const { updateLog, isUpdating } = useMurajaOperation();
  const { alertConfig, hideAlert } = useAlert();

  const updateStatus = async (newStatus: "completed" | "missed") => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const isCompleted = newStatus === "completed";

    try {
      await updateLog({
        plan_id: weeklyPlan?.id,
        date: todayStr,
        start_page: todayPlan.startPage,
        end_page: isCompleted ? todayPlan.endPage : todayPlan.startPage,
        completed_pages:
          isCompleted ? todayPlan.endPage - todayPlan.startPage + 1 : 0,
        actual_time_min: weeklyPlan.estimated_time_min || 0,
        status: newStatus,
        is_catchup: todayPlan.isCatchup ? 1 : 0,
        sync_status: 0,
        remote_id: null,
      });
    } catch (err: any) {
      console.error("Status update failed", err);
    }
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
        onDone={() => updateStatus("completed")}
        onMissed={() => updateStatus("missed")}
        logRoute="/muraja/log"
      />

      <Alert {...alertConfig} onCancel={hideAlert} confirmText="OK" />
    </>
  );
};
