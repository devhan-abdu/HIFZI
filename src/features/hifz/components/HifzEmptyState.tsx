import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Screen from "@/src/components/screen/Screen";
import { Text } from "@/src/components/common/ui/Text";
import { FeatureRow } from "@/src/components/FeatureRow";
export default function HifzEmptyState() {
  const router = useRouter();

  return (
    <Screen>
      <View className="flex-1 px-8 justify-center bg-white">
        <View className="items-center mb-12">
          <Text className="text-2xl text-slate-900 text-center">
            Start Your Hifz Journey
          </Text>
          <Text className="text-slate-500 text-center mt-3 text-sm leading-relaxed px-4">
            "The best of you are those who learn the Quran and teach it."
          </Text>
        </View>

        <View className="gap-y-8 mb-10">
          <FeatureRow
            icon="calendar-outline"
            title="Personalized Schedule"
            desc="Choose your own pace and days for memorization."
          />
          <FeatureRow
            icon="trending-up-outline"
            title="Track Progress"
            desc="See your accuracy and estimated finish date in real-time."
          />
          <FeatureRow
            icon="notifications-outline"
            title="Stay Consistent"
            desc="Daily targets keep you focused on your goal."
          />
        </View>

        <View>
          <Pressable
            onPress={() => router.push("/(app)/hifz/create-hifz-plan")}
            className="bg-primary h-14 rounded-xl flex-row items-center justify-center shadow-sm active:opacity-90 active:scale-[0.98]"
          >
            <Text className="text-white text-base mr-2">Create My Plan</Text>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </Pressable>

          <Text className="text-center text-slate-400 text-[10px] mt-4 uppercase tracking-[2px]">
            It only takes 30 seconds
          </Text>
        </View>
      </View>
    </Screen>
  );
}
