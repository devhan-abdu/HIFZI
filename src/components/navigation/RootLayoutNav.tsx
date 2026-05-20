import { useSession } from "@/src/hooks/useSession";
import {
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppLoadingScreen } from "../common/AppLoadingScreen";
import { StatusBar, View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";

export function RootLayoutNav() {
  const { session, loading, configError } = useSession();

  if (loading) {
    return <AppLoadingScreen />;
  }

  if (configError) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-xl text-primary">App configuration is incomplete</Text>
        <Text className="mt-3 text-center text-base text-slate-600">
          {configError}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={DefaultTheme}>
        <StatusBar barStyle="dark-content" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Protected guard={!!session}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
