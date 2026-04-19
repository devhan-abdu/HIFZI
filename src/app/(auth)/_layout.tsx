import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        animationDuration: 400,
      }}
    >
      <Stack.Screen name="login" />
    </Stack>
  );
}