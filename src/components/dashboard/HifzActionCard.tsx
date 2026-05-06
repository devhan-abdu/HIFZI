import React, { useState } from "react";
import { View, Text } from "react-native";
import { useAddLog } from "@/src/features/hifz/hooks/useAddLog";
import { IHifzPlan } from "@/src/features/hifz/types";
import { useRetentionLog } from "@/src/features/habits/hooks/useRetentionLog";
import { useQuery } from "@tanstack/react-query";
import { pageActivityLogs } from "@/src/features/habits/database/habitSchema";
import { and, gte } from "drizzle-orm";
import { useSession } from "@/src/hooks/useSession";
import { ActionTaskCard } from "../common/ActionCard";
import { Alert } from "../common/Alert";
import { QualityModal } from "../common/QualityModal";
import { useReaderSessionStore } from "@/src/features/quran/store/readerSessionStore";

import { GamificationService } from "@/src/services/GamificationService";
import { useCelebrationStore } from "@/src/hooks/useCelebrationStore";
import { db } from "@/src/lib/db/local-client";
import { userStats } from "@/src/features/user/database/userSchema";
import { eq } from "drizzle-orm";

export const HifzActionCard = ({
  hifz,
  task,
  onStart,
  onResume,
  onDetails,
  title,
  subTitle,
  typeLabel,
}: {
  hifz: IHifzPlan;
  task: any;
  onStart: () => void;
  onResume?: () => void;
  onDetails: () => void;
  title?: string;
  subTitle?: string;
  typeLabel?: string;
}) => {
  const { addLog, isCreating: isAddingHifz } = useAddLog();
  const { logRetention, isLogging: isLoggingRetention } = useRetentionLog();
  const { user } = useSession();
  const session = useReaderSessionStore();
  const trigger = useCelebrationStore((s) => s.trigger);

  const isReinforcement = typeLabel === "Reinforce";

  // Check if reinforcement was done today
  const { data: retentionDoneToday } = useQuery({
    queryKey: ['retention-status', task.startPage, task.endPage],
    queryFn: async () => {
      if (!isReinforcement || !user?.id) return false;
      const today = new Date().toISOString().slice(0, 10);
      const rows = await db.query.pageActivityLogs.findMany({
        where: and(
          eq(pageActivityLogs.userId, user.id),
          eq(pageActivityLogs.source, 'muraja'),
          gte(pageActivityLogs.logDate, today)
        )
      });
      // Simple check: if any log exists for today with source muraja, we consider it "done" for the UI hint
      return rows.length > 0;
    },
    enabled: isReinforcement && !!user?.id
  });

  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [warningVisible, setWarningVisible] = useState(false);
  const [qualityModalVisible, setQualityModalVisible] = useState(false);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  
  // Hifz status comes from daily logs
  const todaysLog = hifz.hifz_daily_logs?.find((log) => log.date === todayStr);
  const hifzStatus = todaysLog?.status || "pending";
  
  // Final status for the UI
  const currentStatus = isReinforcement 
    ? (retentionDoneToday ? "completed" : "pending")
    : hifzStatus;

  const isLoading = isAddingHifz || isLoggingRetention;

  const isResumable = session.currentPage >= task.startPage && session.currentPage <= task.endPage;

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
      if (isReinforcement) {
        if (status === "completed") {
          await logRetention({
            pages: task.actualPages || [],
            quality: quality || 5,
            date: todayStr
          });
          trigger("Retention updated!", "success");
        }
        return;
      }

      const logDay = (new Date().getDay() + 6) % 7;
      const duration = quality ? session.getDurationMinutes() : undefined;
      const pagesViewed = session.pagesViewed;
      
      const actualEnd = pagesViewed.length > 0 ? Math.max(...pagesViewed) : task.endPage;
      const actualCount = pagesViewed.length > 0 ? pagesViewed.length : (task.target || hifz.pages_per_day);

      const payload = {
        hifz_plan_id: hifz.id!,
        actual_pages_completed: status === "completed" ? actualCount : 0,
        actual_start_page: task.startPage,
        actual_end_page: status === "completed" ? actualEnd : task.endPage,
        status: status,
        date: todayStr,
        log_day: logDay,
        quality_score: quality,
        actual_minutes_spent: duration,
      };

      await addLog({ todayLog: payload as any, userId: user?.id });
      
      if (status === "completed") {
        const stats = await db.query.userStats.findFirst({
          where: eq(userStats.userId, user?.id!)
        });
        const currentStreak = stats?.hifzCurrentStreak || 0;

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
        onDone={isReinforcement && currentStatus === "completed" ? undefined : () => {
          if (currentStatus === "completed") {
            handleStatusChange("pending");
          } else {
            setQualityModalVisible(true);
          }
        }}
        onStart={onStart}
        onResume={onResume}
        isResumable={isResumable}
        onDetails={onDetails}
        hideActionButtons={isReinforcement && currentStatus === "completed"}
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

