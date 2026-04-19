import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import StatusBadge from "../../../components/ui/StatusBadge";
import { useRouter } from "expo-router";
import { TodayPlanType } from "@/src/types";

export default function WeeklyPlanCard({
  plan,
  isHero = false,
}: {
  plan: TodayPlanType;
  isHero?: boolean;
}) {
  const {
    id: planId,
    day_of_week: day,
    date,
    status,
    startSurah,
    endSurah,
    log_id: logId,
    planned_pages: pages,
    estimated_time_min: minutes,
    planned_start_page: startPage,
    planned_end_page: endPage,
  } = plan;

  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  if (!planId) return null;

  const handlePress = () => {

   router.push({
     pathname: "/muraja/log",
   });
  };

  const containerStyle =
    isHero ?
      "bg-primary rounded-[32px] p-6 shadow-xl shadow-primary/30 border border-white/10 mb-6"
    : "bg-white rounded-[24px] p-5 border border-gray-200 mb-4 shadow-xs ";

  const textPrimary = isHero ? "text-white" : "text-gray-900";
  const textSecondary = isHero ? "text-white/60" : "text-gray-500";
  const dividerColor = isHero ? "bg-white/10" : "bg-gray-100";
  const iconColor = isHero ? "#ffffff" : "#4b5563";

  return (
    <View className={containerStyle}>
      <View className="flex-row justify-between items-start mb-5">
        <View className="flex-1">
          <Text
            className={`${textSecondary} text-[10px]  uppercase tracking-widest mb-1`}
          >
            {isHero ? "Current Session" : day}
          </Text>
          <Text className={`${textPrimary} text-2xl  tracking-tight`}>
            {startSurah === endSurah ?
              startSurah
            : `${startSurah} – ${endSurah}`}
          </Text>
        </View>
        <StatusBadge status={status} inverted={isHero} />
      </View>

      <View
        className={`flex-row items-center border-t ${
          isHero ? "border-white/10" : "border-gray-100"
        } pt-5`}
      >
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <Ionicons
              name="book-outline"
              size={14}
              color={isHero ? "rgba(255,255,255,0.6)" : iconColor}
            />
            <Text className={`${textPrimary}   text-sm`}>
              Pgs {startPage}-{endPage}
            </Text>
          </View>
          <Text className={`${textSecondary} text-[9px]   uppercase`}>
            Range
          </Text>
        </View>

        <View className={`h-8 w-[1px] ${dividerColor} mx-4`} />

        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <Ionicons
              name="time-outline"
              size={14}
              color={isHero ? "rgba(255,255,255,0.6)" : iconColor}
            />
            <Text className={`${textPrimary}   text-sm`}>{minutes}m</Text>
          </View>
          <Text className={`${textSecondary} text-[9px]   uppercase`}>
            Duration
          </Text>
        </View>

        <View className={`h-8 w-[1px] ${dividerColor} mx-4`} />

        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <Ionicons
              name="layers-outline"
              size={14}
              color={isHero ? "rgba(255,255,255,0.6)" : iconColor}
            />
            <Text className={`${textPrimary}   text-sm`}>{pages}</Text>
          </View>
          <Text className={`${textSecondary} text-[9px]   uppercase`}>
            Pages
          </Text>
        </View>
      </View>

      {date <= today && (
        <Button
          className={`mt-6 h-12 rounded-2xl ${
            isHero ? "bg-white shadow-none" : ""
          }`}
          onPress={handlePress}
          variant={
            isHero ? "none"
            : today === date ?
              "primary"
            : "outline"
          }
        >
          {today === date ?
            "Log Today's Muraja'a"
          : status === "completed" ?
            "Veiw Log"
          : "Catch up"}
        </Button>
      )}
    </View>
  );
}
