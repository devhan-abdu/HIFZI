import { View, Pressable } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { Ionicons } from "@expo/vector-icons";
import { useNavigate } from "@/src/hooks/useNavigate";
import Screen from "@/src/components/screen/Screen";
import { FeatureRow } from "@/src/components/FeatureRow";
import { ScreenContent } from "@/src/components/screen/ScreenContent";

export default function MurajaEmptyState() {
  const { push } = useNavigate();

  return (
    <Screen>
      <ScreenContent>
        <View className="flex-1 px-8 justify-center bg-background">
          <View className="items-center mb-12">
            <Text className="text-2xl  text-text text-center">
              Strengthen Your Quran
            </Text>
            <Text className="text-muted text-center mt-3 text-sm leading-relaxed px-4">
              "Keep refreshing the Quran, for it leaves the heart faster than a
              camel escapes its tie."
            </Text>
          </View>

          <View className="gap-y-8 mb-16">
            <FeatureRow
              icon="infinite-outline"
              title="Weekly Rotations"
              desc="Organize your revision into 7-day manageable sessions."
            />
            <FeatureRow
              icon="shield-checkmark-outline"
              title="Prevent Forgetfulness"
              desc="Regular review ensures your Hifz stays solid for life."
            />
            <FeatureRow
              icon="stats-chart-outline"
              title="Detailed Analytics"
              desc="Track which Juz or Surahs need more focus."
            />
          </View>

          <View>
            <Pressable
              onPress={() => push("/(app)/muraja/create-muraja-plan")}
              className="bg-primary h-14 rounded-xl flex-row items-center justify-center shadow-sm active:opacity-90 active:scale-[0.98]"
            >
              <Text className="text-primary-foreground  text-base mr-2">Create Muraja Plan</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </Pressable>

            <Text className="text-center text-muted text-[10px] mt-4 uppercase tracking-[2px]">
              Establish Your Routine
            </Text>
          </View>
        </View>
      </ScreenContent>
    </Screen>
  );
}
