import React, { useState } from "react";
import { View, Text } from "react-native";
import { useAddLog } from "@/src/features/hifz/hooks/useAddLog";
import { IHifzPlan, IHifzLog } from "@/src/features/hifz/types";
import { useSession } from "@/src/hooks/useSession";
import { ActionTaskCard } from "../common/ActionCard";
import { Alert } from "../common/Alert";
import { QualityModal } from "../common/QualityModal";
import { useCelebrationStore } from "@/src/hooks/useCelebrationStore";

import { useNavigate } from "@/src/hooks/useNavigate";

export const HifzActionCard = ({
  hifz,
  task,
  onDetails,
  title,
  subTitle,
  typeLabel,
}: {
  hifz: IHifzPlan;
  task: any;
  onDetails: () => void;
  title?: string;
  subTitle?: string;
  typeLabel?: string;
}) => {
  const { addLog, isCreating: isAddingHifz } = useAddLog();
  const { user } = useSession();
  const trigger = useCelebrationStore((s) => s.trigger);
  const { push } = useNavigate();

  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [warningVisible, setWarningVisible] = useState(false);
  const [qualityModalVisible, setQualityModalVisible] = useState(false);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  
  const todaysLog = hifz.hifzDailyLogs?.find((log) => log.date === todayStr);
  const currentStatus = todaysLog?.status || "pending";

  const isLoading = isAddingHifz;

  if (!task) {
    return (
      <View className="bg-slate-50 border border-dashed border-slate-200 rounded-[24px] p-6 items-center">
        <Text className="text-slate-400 text-[10px] uppercase tracking-widest">
          Rest Day (No Hifz)
        </Text>
      </View>
    );
  }

  const handleStatusChange = async (status: "completed" | "pending" | "missed", quality?: number) => {
    if (!hifz || !task || isLoading || !hifz.id) return;

    try {
      const logDay = (new Date().getDay() + 6) % 7;
      
      const payload: IHifzLog = {
        hifzPlanId: hifz.id!,
        actualPagesCompleted: status === "completed" ? (task.target || hifz.pagesPerDay) : 0,
        actualStartPage: task.startPage,
        actualEndPage: task.endPage,
        status: status === "pending" ? "missed" : status as any, // Hifz logs don't use 'pending'
        date: todayStr,
        logDay: logDay,
        qualityScore: quality,
      };

      // Special case for toggling back to pending: delete the log
      if (status === "pending") {
         // @ts-ignore - 'pending' status in todayLog triggers a delete
        payload.status = "pending";
      }

      const result = await addLog({ todayLog: payload, userId: user?.id }) as any;
      
      if (status === "completed" && result?.rewards) {
        const rewards = result.rewards;
        if (rewards.rewards?.length > 0) {
          trigger(`Mubarak! New Badge: ${rewards.rewards[0].replace('BADGE_', '')}`, "badge");
        } else if (rewards.isPerfect) {
          trigger("MashAllah! Perfect Session!", "success");
        } else {
          trigger("Alhamdulillah! Progress Saved", "success");
        }
      }
    } catch (err) {
      setErrorMessage("Could not update your progress.");
      setErrorVisible(true);
    }
  };

  return (
    <>
      <ActionTaskCard
        typeLabel={typeLabel || "Hifz"}
        title={title || task.displaySurah || ""}
        subTitle={subTitle || `${task.isVirtualTask ? "Next Suggested · " : ""}Pages ${task.startPage} – ${task.endPage}`}
        isCatchup={task.isCatchup}
        status={currentStatus}
        isLoading={isLoading}
        onDone={() => {
          if (currentStatus === "completed") {
            handleStatusChange("pending");
          } else {
            setQualityModalVisible(true);
          }
        }}
        onStart={() => {
          push(`/(app)/quran/reader?page=${task.startPage}&planId=${hifz.id}&type=hifz&start=${task.startPage}&end=${task.endPage}`);
        }}
        onDetails={onDetails}
      />

      <QualityModal
        visible={qualityModalVisible}
        onClose={() => setQualityModalVisible(false)}
        onSelect={(score) => {
          setQualityModalVisible(false);
          handleStatusChange("completed", score);
        }}
        title="Rate your session"
      />

      <Alert
        visible={errorVisible}
        type="delete"
        title="Action Failed"
        message={errorMessage}
        confirmText="Try Again"
        cancelText="Close"
        onConfirm={() => setErrorVisible(false)}
        onCancel={() => setErrorVisible(false)}
      />
      <Alert
        visible={warningVisible}
        type="warning"
        title="Overwrite Progress?"
        message="You already marked today as completed. Skipping now will delete your saved pages for today. Continue?"
        confirmText="Yes, Skip"
        cancelText="Keep Progress"
        onConfirm={async () => {
          setWarningVisible(false);
          await handleStatusChange("missed");
        }}
        onCancel={() => setWarningVisible(false)}
      />
    </>
  );
};
