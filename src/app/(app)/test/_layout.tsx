import { Header } from "@/src/components/navigation/Header";
import { Stack } from "expo-router";
import { View } from "react-native";

export default function HifzLayout() {
  return (
    <View className="flex-1 bg-surface">
      <Header title="Hifz" />

      <Stack
        screenOptions={{
          headerShown: false,
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
