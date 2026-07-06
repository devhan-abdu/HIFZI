import { View, Pressable } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { Ionicons } from "@expo/vector-icons";
import type { JourneySessionEntry } from "../types";

function Stars({ score }: { score: number | null }) {
  if (score == null) return <Text className="text-muted text-xs">—</Text>;
  return (
    <Text className="text-amber-500 text-xs">
      {"★".repeat(Math.min(5, Math.max(1, score)))}
      {"☆".repeat(Math.max(0, 5 - score))}
    </Text>
  );
}

export function JourneyTimelineSection({
  sessions,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  sessions: JourneySessionEntry[];
  hasMore: boolean;
  loadingMore?: boolean;
  onLoadMore: () => void;
}) {
  if (sessions.length === 0) {
    return (
      <View className="rounded-2xl border border-dashed border-border bg-background p-6">
        <Text className="text-text">No sessions logged yet</Text>
        <Text className="text-muted text-sm mt-1">
          Your Hifz and Muraja activity will appear here as you log progress.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {sessions.map((session, index) => (
        <View key={session.id} className="flex-row mb-4">
          <View className="items-center mr-3 w-4">
            <View
              className={`w-3 h-3 rounded-full mt-1.5 ${
                session.isMissed ? "bg-red-400" : "bg-primary"
              }`}
            />
            {index < sessions.length - 1 ? (
              <View className="w-px flex-1 bg-surface mt-1" />
            ) : null}
          </View>

          <View className="flex-1 bg-surface border border-border rounded-xl p-3">
            <View className="flex-row justify-between items-start">
              <View className="flex-1 pr-2">
                <Text className="text-[10px] uppercase tracking-widest text-muted">
                  {session.activityType === "HIFZ" ? "Hifz" : "Muraja"}
                </Text>
                <Text className="text-text text-sm mt-0.5">{session.reference}</Text>
                <Text className="text-muted text-xs mt-0.5">{session.planName}</Text>
              </View>
              {session.isMissed ? (
                <View className="bg-red-50 px-2 py-0.5 rounded-full">
                  <Text className="text-red-700 text-[10px] uppercase">Missed</Text>
                </View>
              ) : null}
            </View>

            <View className="flex-row flex-wrap gap-3 mt-2">
              <Text className="text-muted text-xs">{formatDate(session.date)}</Text>
              <Text className="text-muted text-xs">{session.durationMinutes} min</Text>
              <Text className="text-muted text-xs">{session.pagesCompleted} pgs</Text>
              <Stars score={session.qualityScore} />
            </View>
          </View>
        </View>
      ))}

      {hasMore ? (
        <Pressable
          onPress={onLoadMore}
          disabled={loadingMore}
          className="flex-row items-center justify-center py-3 border border-border rounded-xl"
        >
          <Text className="text-primary text-sm mr-1">
            {loadingMore ? "Loading…" : "Load more sessions"}
          </Text>
          {!loadingMore ? (
            <Ionicons name="chevron-down" size={16} color="#276359" />
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}
