import React, { useState } from "react";
import { View, Text } from "react-native";
import { useAddLog } from "@/src/features/hifz/hook/useAddLog";
import { IHifzPlan } from "@/src/features/hifz/types";
import { useSession } from "@/src/hooks/useSession";
import { ActionTaskCard } from "../common/ActionCard";
import { Alert } from "../common/Alert";

export const HifzActionCard = ({
  hifz,
  todayTask,
}: {
  hifz: IHifzPlan;
  todayTask: any;
}) => {
  const { addLog, isCreating } = useAddLog();
  const { user } = useSession();

  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [warningVisible, setWarningVisible] = useState(false);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todaysLog = hifz.hifz_daily_logs?.find((log) => log.date === todayStr);
  const currentStatus = todaysLog?.status || "pending";

  if (!todayTask) {
    return (
      <View className="bg-slate-50 border border-dashed border-slate-200 rounded-[24px] p-6 items-center">
        <Text className="text-slate-400   text-[10px] uppercase tracking-widest">
          Rest Day (No Hifz)
        </Text>
      </View>
    );
  }

  const handleStatusChange = async (status: "completed" | "missed") => {
    if (!hifz || !todayTask || isCreating || !hifz.id) return;

    const logDay = (new Date().getDay() + 6) % 7;
    const payload = {
      hifz_plan_id: hifz.id!,
      actual_pages_completed: status === "completed" ? hifz.pages_per_day : 0,
      actual_start_page: todayTask.startPage,
      actual_end_page: todayTask.endPage,
      status,
      date: todayStr,
      log_day: logDay,
    };
    try {
      await addLog({ todayLog: payload, userId: user?.id });
    } catch (err) {
      setErrorMessage(
        "Could not save your progress. Please check your connection.",
      );
      setErrorVisible(true);
    }
  };

  return (
    <>
      <ActionTaskCard
        typeLabel="Hifz"
        title={todayTask.displaySurah ?? ""}
        subTitle={`${todayTask.isVirtualTask ? "Next Suggested · " : ""}Pages ${todayTask.startPage} – ${todayTask.endPage}`}
        isCatchup={todayTask.isCatchup}
        status={currentStatus}
        isLoading={isCreating}
        onDone={() => handleStatusChange("completed")}
        onMissed={() => handleStatusChange("missed")}
        logRoute="/hifz/log"
      />

      <Alert
        visible={errorVisible}
        type="delete"
        title="Action Failed"
        message={errorMessage}
        confirmText="Try Again"
        cancelText="Close"
        onConfirm={() => {
          setErrorVisible(false);
        }}
        onCancel={() => setErrorVisible(false)}
      />
      <Alert
        visible={warningVisible}
        type="warning"
        title="Overwrite Progress?"
        message="You already marked today as completed. Skipping now will delete your saved pages for today. Continue?"
        confirmText="Yes, Skip"
        cancelText="Keep Progress"
        onConfirm={() => {
          setWarningVisible(false);
          handleStatusChange("missed");
        }}
        onCancel={() => {
          setWarningVisible(false);
        }}
      />
    </>
  );
};
