import { View, Text, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Screen from "@/src/components/screen/Screen";
import { FeatureRow } from "@/src/components/FeatureRow";

export default function HifzEmptyState() {
  const router = useRouter();

  return (
    <Screen>
      <View className="flex-1 px-6 justify-center bg-white">
        <View className="items-center mb-10">
          <View className="w-24 h-24 bg-primary/10 rounded-full items-center justify-center mb-6">
            <Ionicons name="book-outline" size={48} color="#276359" />
          </View>
          <Text className="text-3xl  text-gray-900 text-center px-4">
            Start Your Hifz Journey
          </Text>
          <Text className="text-gray-500 text-center mt-3 text-base leading-6 px-6">
            "The best of you are those who learn the Quran and teach it."
          </Text>
        </View>

        <View className="gap-y-6 mb-12">
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

        <Pressable
          onPress={() => router.push("/(app)/hifz/create-hifz-plan")}
          className="bg-primary h-16 rounded-2xl flex-row items-center justify-center shadow-lg shadow-primary/30 active:scale-[0.98]"
        >
          <Text className="text-white  text-lg mr-2">Create My Plan</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </Pressable>

        <Text className="text-center text-gray-400 text-xs mt-6 uppercase tracking-widest">
          It only takes 30 seconds
        </Text>
      </View>
    </Screen>
  );
}
