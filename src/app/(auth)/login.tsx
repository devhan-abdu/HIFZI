import { View, StatusBar } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import LoginButton from "@/src/components/LoginButton";
import { useSession } from "@/src/hooks/useSession";
import { router } from "expo-router";
import { useEffect } from "react";

export default function IntroScreen() {
  const session = useSession();
  useEffect(() => {
    if (session?.user) {
      router.replace("/(app)");
    }
  }, [session?.user]);

  return (
    <View className="flex-1 bg-primary px-8 pt-24 pb-16 justify-between">
      <StatusBar barStyle="light-content" />

      <View>
        <View className="flex-row items-center mb-2">
          <View className="h-[1px] w-6 bg-white/30 mr-3" />
          <Text className="text-white/50 uppercase tracking-[3px] text-xs">
            Powered by Quran.com
          </Text>
        </View>
        <Text className="text-white text-6xl leading-[60px] tracking-tighter">
          Master Your{"\n"}Hifz &{"\n"}Muraj'a
        </Text>
      </View>

      <View className="gap-y-8">
        <View className="flex-row items-start">
          <View className="w-1 bg-white/30 h-full mr-4 rounded-full" />
          <View className="flex-1">
            <Text className="text-white text-xl mb-1">Guided Hifz</Text>
            <Text className="text-white/60 leading-5">
              A structured, page-by-page tracker to help you memorize with
              consistency.
            </Text>
          </View>
        </View>

        <View className="flex-row items-start">
          <View className="w-1 bg-white/30 h-full mr-4 rounded-full" />
          <View className="flex-1">
            <Text className="text-white text-xl mb-1">Smart Muraja</Text>
            <Text className="text-white/60 leading-5">
              Never forget a single Ayah with our automated revision scheduling
              system.
            </Text>
          </View>
        </View>
      </View>

      <View className="items-center">
        <LoginButton />
      </View>
    </View>
  );
}
