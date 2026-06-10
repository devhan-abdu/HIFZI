import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { Text } from "@/src/components/common/ui/Text";
import { View } from "react-native";
import { getRankForLevel } from "@/src/features/gamification/constants";

type HifzAnalytics = {
  progress?: number;
  currentSurah?: string;
  pageInSurah?: number;
  planRangeLabel?: string;
  targetEndDate?: string;
  todayTarget?: number;
};

type MurajaHero = {
  pageInSurah?: number;
  currentSurah?: string;
  planRangeLabel?: string;
  targetEndDate?: string | null;
  planned_pages_per_day?: number | null;
  totalDays?: number;
  overAllProgress?: string | number;
  startSurah?: string;
};

type Cardprops = {
  hifzAnalytics?: HifzAnalytics | null;
  murajaHero?: MurajaHero | null;
  habitProgress: {
    progressByType: {
      HIFZ: { units: number; sessions: number };
      MURAJA: { units: number; sessions: number };
      NORMAL_READING: { units: number; sessions: number };
    };
    analytics: { longestStreak: number; currentStreak?: number };
  };
  userStats: {
    totalXp: number;
    level: number;
    hifzCurrentStreak: number;
  } | null;
};

function cleanSurahName(name?: string) {
  return name?.replace(/^Surat\s+/i, "").trim() || "—";
}

function PageOfSurah({
  pageInSurah,
  surahName,
  fallbackLabel,
}: {
  pageInSurah?: number;
  surahName?: string;
  fallbackLabel?: string;
}) {
  if (pageInSurah == null && !surahName && fallbackLabel) {
    return (
      <Text
        className="text-white text-2xl tracking-tight leading-8"
        numberOfLines={2}
      >
        {fallbackLabel}
      </Text>
    );
  }

  return (
    <Text
      className="text-white text-2xl tracking-tight leading-8"
      numberOfLines={2}
    >
      {pageInSurah ?? "—"} of {cleanSurahName(surahName)}
    </Text>
  );
}

function FooterStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="text-white/40 text-[8px] uppercase tracking-[1.2px] mb-0.5">
        {label}
      </Text>
      <Text className="text-white text-[11px] leading-4" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function PlanSection({
  icon,
  label,
  pageInSurah,
  surahName,
  planRangeLabel,
  fallbackLabel,
  primaryStat,
  secondaryStat,
  tertiaryStat,
  showBorder,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  pageInSurah?: number;
  surahName?: string;
  planRangeLabel?: string;
  fallbackLabel?: string;
  primaryStat: { label: string; value: string };
  secondaryStat: { label: string; value: string };
  tertiaryStat?: { label: string; value: string };
  showBorder?: boolean;
}) {
  return (
    /* FIXED: Using w-full when standalone, and flex-1 only when dual-plan border properties exist */
    <View
      className={`${showBorder ? "flex-1 border-r border-white/10 pr-4 mr-4" : "w-full"}`}
    >
      <View className="flex-row items-center mb-3">
        <Ionicons name={icon} size={14} color="rgba(255,255,255,0.7)" />
        <Text className="text-white/50 text-[9px] uppercase tracking-widest ml-2">
          {label}
        </Text>
      </View>

      <PageOfSurah
        pageInSurah={pageInSurah}
        surahName={surahName}
        fallbackLabel={fallbackLabel}
      />

      {planRangeLabel ?
        <Text
          className="text-white/55 text-[11px] mt-2 tracking-wide"
          numberOfLines={2}
        >
          {planRangeLabel}
        </Text>
      : null}

      <View className="flex-row justify-between items-end pt-5">
        <FooterStat label={primaryStat.label} value={primaryStat.value} />
        <View className="w-4" />
        <FooterStat label={secondaryStat.label} value={secondaryStat.value} />
        {tertiaryStat ?
          <>
            <View className="w-4" />
            <FooterStat label={tertiaryStat.label} value={tertiaryStat.value} />
          </>
        : null}
      </View>
    </View>
  );
}

export default function Card({
  hifzAnalytics,
  habitProgress,
  murajaHero,
  userStats,
}: Cardprops) {
  if (!murajaHero && !hifzAnalytics) return null;

  const hasHifz = !!hifzAnalytics;
  const hasMuraja = !!murajaHero;
  const dualPlan = hasHifz && hasMuraja;
  const singlePlan = hasHifz !== hasMuraja;

  const murajaProgress =
    murajaHero?.overAllProgress ?
      Math.round(Number(murajaHero.overAllProgress))
    : 0;

  return (
    <View className="bg-primary rounded-[40px] p-7 shadow-2xl shadow-primary/40 overflow-hidden relative w-full">
      <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />

      <View className="flex-row justify-between items-end mb-6">
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Text className="text-white/60 uppercase tracking-[2px] text-[10px]">
              {format(new Date(), "EEEE, MMM dd")}
            </Text>
            {userStats && (
              <Text className="text-white/80 text-[10px] tracking-widest ml-3">
                LVL {userStats.level}
              </Text>
            )}
          </View>
          <Text className="text-white text-3xl tracking-tighter">
            {dualPlan ?
              <>
                Hifz <Text className="text-white/50">&</Text> Muraja
              </>
            : hasHifz ?
              "Hifz Journey"
            : "Muraja Review"}
          </Text>

          {userStats &&
            (() => {
              const currentRank = getRankForLevel(userStats.level);
              return (
                <View className="mt-2 w-44">
                  <Text className="text-white/80 text-[10px] mb-1 tracking-wide">
                    {currentRank.title} {currentRank.titleAr}
                  </Text>
                  <View className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <View
                      className="h-full bg-white"
                      style={{ width: `${(userStats.totalXp % 1000) / 10}%` }}
                    />
                  </View>
                </View>
              );
            })()}
        </View>

        {singlePlan && hasHifz && (
          <View className="items-end">
            <Text className="text-white text-3xl tracking-tight">
              {hifzAnalytics?.progress ?? 0}%
            </Text>
            <Text className="text-white/50 text-[9px] uppercase tracking-widest">
              memorized
            </Text>
          </View>
        )}
        {singlePlan && hasMuraja && (
          <View className="items-end">
            <Text className="text-white text-3xl tracking-tight">
              {murajaProgress}%
            </Text>
            <Text className="text-white/50 text-[9px] uppercase tracking-widest">
              of range
            </Text>
          </View>
        )}
      </View>

      <View className="w-full h-[2px] bg-white/10 rounded-full mb-6" />

      <View className={dualPlan ? "flex-row w-full " : "flex-col w-full"}>
        {hasHifz && (
          <View>
          <PlanSection
            icon="book-outline"
            label={dualPlan ? "Current Hifz" : "Hifz"}
            pageInSurah={hifzAnalytics?.pageInSurah}
            surahName={hifzAnalytics?.currentSurah}
            planRangeLabel={hifzAnalytics?.planRangeLabel}
            primaryStat={{
              label: dualPlan ? "Target End" : "Est. finish",
              value: hifzAnalytics?.targetEndDate ?? "—",
            }}
            secondaryStat={{
              label: dualPlan ? "Rate" : "Daily rate",
              value: `${hifzAnalytics?.todayTarget ?? 0} p/d`,
            }}
            tertiaryStat={
              singlePlan ?
                {
                  label: "Streak",
                  value: `${
                    habitProgress.analytics.currentStreak ??
                    userStats?.hifzCurrentStreak ??
                    0
                  } d`,
                }
              : undefined
            }
            showBorder={dualPlan}
            />
            </View>
        )}

        {hasMuraja && murajaHero && (
          <View className = "flex-1">
          <PlanSection
            icon="repeat-outline"
            label={dualPlan ? "Current Muraja" : "Muraja"}
            pageInSurah={murajaHero.pageInSurah}
            surahName={murajaHero.currentSurah}
            planRangeLabel={murajaHero.planRangeLabel}
            fallbackLabel={cleanSurahName(murajaHero.startSurah)}
            primaryStat={{
              label: dualPlan ? "Target End" : "Days/wk",
              value:
                dualPlan ?
                  (murajaHero.targetEndDate ?? "—")
                : `${murajaHero.totalDays ?? 0}`,
            }}
            secondaryStat={{
              label: dualPlan ? "Rate" : "Daily goal",
              value:
                dualPlan ?
                  `${murajaHero.planned_pages_per_day ?? 0} p/d`
                : `${murajaHero.planned_pages_per_day ?? 0} pgs`,
            }}
            tertiaryStat={
              singlePlan ?
                { label: "Progress", value: `${murajaProgress}%` }
              : undefined
            }
            />
            </View>
        )}
      </View>
    </View>
  );
}
