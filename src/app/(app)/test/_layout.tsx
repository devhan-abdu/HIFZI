import { Header } from "@/src/components/navigation/Header";
import { Stack } from "expo-router";
import { View } from "react-native";

export default function HifzLayout() {
  return (
    <View className="flex-1 bg-white">
      <Header title="Hifz Al-Quran" />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "white" },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            animation: "fade",
          }}
        />
        <Stack.Screen
          name="exam"
          options={{
            animation: "fade",
          }}
        />
      </Stack>
    </View>
  );
}
