import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { Text } from "@/src/components/common/ui/Text";
import { View } from "react-native";
import { getRankForLevel } from "@/src/features/gamification/constants";

const DUAL_COLUMN_MIN_H = 168;

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
  userStats: { totalXp: number; level: number; hifzCurrentStreak: number } | null;
};

function cleanSurahName(name?: string) {
  return name?.replace(/^Surat\s+/i, "").trim() || "—";
}

function PlanColumn({
  children,
  showBorder,
}: {
  children: React.ReactNode;
  showBorder?: boolean;
}) {
  return (
    <View className={`flex-1 ${showBorder ? "pr-5 border-r border-white/10" : "pl-5"}`}>
      {children}
    </View>
  );
}

function PageOfSurah({
  pageInSurah,
  surahName,
}: {
  pageInSurah?: number;
  surahName?: string;
}) {
  return (
    <Text className="text-white text-2xl tracking-tight leading-8" numberOfLines={2}>
      {pageInSurah ?? "—"} of {cleanSurahName(surahName)}
    </Text>
  );
}

function ColumnFooter({
  children,
  dual,
}: {
  children: React.ReactNode;
  dual?: boolean;
}) {
  return (
    <View
      className={`flex-row justify-between items-end ${dual ? "pt-5" : "pt-6 mt-auto"}`}
    >
      {children}
    </View>
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

  const murajaProgress = murajaHero?.overAllProgress
    ? Math.round(Number(murajaHero.overAllProgress))
    : 0;

  return (
    <View className="bg-primary rounded-[40px] p-7 shadow-2xl shadow-primary/40 overflow-hidden relative">
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
            {dualPlan ? (
              <>
                Hifz <Text className="text-white/50">&</Text> Muraja
              </>
            ) : hasHifz ? (
              "Hifz Journey"
            ) : (
              "Muraja Review"
            )}
          </Text>

          {userStats && (() => {
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

      <View className={dualPlan ? "flex-row" : ""}>
        {hasHifz && (
          <PlanColumn showBorder={dualPlan}>
            <View
              style={dualPlan ? { minHeight: DUAL_COLUMN_MIN_H } : undefined}
              className={dualPlan ? "justify-between flex-1" : "min-h-[120px] justify-between"}
            >
              <View>
                <View className="flex-row items-center mb-3">
                  <Ionicons name="book-outline" size={13} color="rgba(255,255,255,0.7)" />
                  <Text className="text-white/50 text-[9px] uppercase tracking-widest ml-2">
                    {dualPlan ? "Current Hifz" : "Hifz"}
                  </Text>
                </View>

                <PageOfSurah
                  pageInSurah={hifzAnalytics?.pageInSurah}
                  surahName={hifzAnalytics?.currentSurah}
                />

                {hifzAnalytics?.planRangeLabel ? (
                  <Text
                    className="text-white/55 text-[11px] mt-2 tracking-wide"
                    numberOfLines={2}
                  >
                    {hifzAnalytics.planRangeLabel}
                  </Text>
                ) : null}
              </View>

              <ColumnFooter dual={dualPlan}>
                <FooterStat
                  label={dualPlan ? "Target End" : "Est. finish"}
                  value={hifzAnalytics?.targetEndDate ?? "—"}
                />
                <View className="w-4" />
                <FooterStat
                  label={dualPlan ? "Rate" : "Daily rate"}
                  value={`${hifzAnalytics?.todayTarget ?? 0} p/d`}
                />
                {singlePlan ? (
                  <>
                    <View className="w-4" />
                    <FooterStat
                      label="Streak"
                      value={`${
                        habitProgress.analytics.currentStreak ??
                        userStats?.hifzCurrentStreak ??
                        0
                      } d`}
                    />
                  </>
                ) : null}
              </ColumnFooter>
            </View>
          </PlanColumn>
        )}

        {hasMuraja && murajaHero && (
          <PlanColumn showBorder={false}>
            <View
              style={dualPlan ? { minHeight: DUAL_COLUMN_MIN_H } : undefined}
              className={dualPlan ? "justify-between flex-1" : "min-h-[120px] justify-between"}
            >
              <View>
                <View className="flex-row items-center mb-3">
                  <Ionicons
                    name="repeat-outline"
                    size={15}
                    color="rgba(255,255,255,0.7)"
                  />
                  <Text className="text-white/50 text-[9px] uppercase tracking-widest ml-2">
                    {dualPlan ? "Current Muraja" : "Muraja"}
                  </Text>
                </View>

                <PageOfSurah
                  pageInSurah={murajaHero.pageInSurah}
                  surahName={murajaHero.currentSurah}
                />

                {murajaHero.planRangeLabel ? (
                  <Text
                    className="text-white/55 text-[11px] mt-2 tracking-wide"
                    numberOfLines={2}
                  >
                    {murajaHero.planRangeLabel}
                  </Text>
                ) : null}
              </View>

              <ColumnFooter dual={dualPlan}>
                <FooterStat
                  label={dualPlan ? "Target End" : "Days/wk"}
                  value={
                    dualPlan
                      ? murajaHero.targetEndDate ?? "—"
                      : `${murajaHero.totalDays ?? 0}`
                  }
                />
                <View className="w-4" />
                <FooterStat
                  label={dualPlan ? "Rate" : "Daily goal"}
                  value={
                    dualPlan
                      ? `${murajaHero.planned_pages_per_day ?? 0} p/d`
                      : `${murajaHero.planned_pages_per_day ?? 0} pgs`
                  }
                />
                {singlePlan ? (
                  <>
                    <View className="w-4" />
                    <FooterStat label="Progress" value={`${murajaProgress}%`} />
                  </>
                ) : null}
              </ColumnFooter>
            </View>
          </PlanColumn>
        )}
      </View>
    </View>
  );
}
