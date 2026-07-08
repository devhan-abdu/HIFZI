import { useState } from "react";
import { View, Pressable, LayoutAnimation, Platform, UIManager } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { Ionicons } from "@expo/vector-icons";
import type { JourneySessionEntry } from "../types";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PRIMARY = "#276359";

function Stars({ score }: { score: number | null }) {
  if (score == null) return <Text className="text-muted text-xs">—</Text>;
  return (
    <Text className="text-amber-500 text-xs">
      {"★".repeat(Math.min(5, Math.max(1, score)))}
      {"☆".repeat(Math.max(0, 5 - score))}
    </Text>
  );
}

/** Group sessions by date (YYYY-MM-DD) */
function groupByDate(sessions: JourneySessionEntry[]): { date: string; items: JourneySessionEntry[] }[] {
  const map = new Map<string, JourneySessionEntry[]>();
  for (const s of sessions) {
    const dateKey = (s.date ?? "").slice(0, 10);
    if (!map.has(dateKey)) map.set(dateKey, []);
    map.get(dateKey)!.push(s);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, items }));
}

function formatDate(value: string) {
  try {
    const d = new Date(value + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return value;
  }
}

function SessionItem({ session }: { session: JourneySessionEntry }) {
  return (
    <View className="flex-row items-start py-3 border-t border-border">
      <View
        className="w-2 h-2 rounded-full mt-1.5 mr-3"
        style={{ backgroundColor: session.isMissed ? "#f87171" : PRIMARY }}
      />
      <View className="flex-1">
        <View className="flex-row justify-between items-start">
          <Text className="text-text text-sm flex-1 pr-2">{session.reference}</Text>
          {session.isMissed ? (
            <View className="bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
              <Text className="text-red-700 dark:text-red-400 text-[10px] uppercase">Missed</Text>
            </View>
          ) : null}
        </View>
        <Text className="text-muted text-xs mt-0.5">{session.planName}</Text>
        <View className="flex-row flex-wrap gap-3 mt-1.5">
          <Text className="text-muted text-xs">
            {session.activityType === "HIFZ" ? "Hifz" : "Muraja"}
          </Text>
          {session.durationMinutes > 0 ? (
            <Text className="text-muted text-xs">{session.durationMinutes} min</Text>
          ) : null}
          {session.pagesCompleted > 0 ? (
            <Text className="text-muted text-xs">{session.pagesCompleted} pgs</Text>
          ) : null}
          <Stars score={session.qualityScore} />
        </View>
      </View>
    </View>
  );
}

function DateGroup({
  date,
  items,
  defaultExpanded = false,
}: {
  date: string;
  items: JourneySessionEntry[];
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <View className="bg-surface dark:bg-surface-muted border border-border rounded-2xl mb-3 overflow-hidden">
      <Pressable
        onPress={toggle}
        className="flex-row items-center justify-between px-4 py-3 active:opacity-70"
      >
        <View className="flex-row items-center gap-2">
          <Text className="text-text text-sm">{formatDate(date)}</Text>
          <View className="px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20">
            <Text className="text-[10px] text-primary dark:text-emerald-400">
              {items.length} {items.length === 1 ? "session" : "sessions"}
            </Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color="#94a3b8"
        />
      </Pressable>

      {expanded ? (
        <View className="px-4 pb-2">
          {items.map((s) => (
            <SessionItem key={s.id} session={s} />
          ))}
        </View>
      ) : null}
    </View>
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
  const { colorScheme } = require("react-native").useColorScheme();
  const isDark = colorScheme === "dark";

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

  const groups = groupByDate(sessions);

  return (
    <View>
      {groups.map((group, index) => (
        <DateGroup
          key={group.date}
          date={group.date}
          items={group.items}
          defaultExpanded={index === 0}
        />
      ))}

      {hasMore ? (
        <Pressable
          onPress={onLoadMore}
          disabled={loadingMore}
          className="flex-row items-center justify-center py-3 border border-border rounded-xl bg-surface dark:bg-surface-muted"
        >
          <Text className="text-primary dark:text-emerald-400 text-sm mr-1">
            {loadingMore ? "Loading…" : "Load more sessions"}
          </Text>
          {!loadingMore ? (
            <Ionicons name="chevron-down" size={16} color={isDark ? "#4ade80" : PRIMARY} />
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}
