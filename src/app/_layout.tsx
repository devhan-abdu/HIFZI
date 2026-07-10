import { useEffect, useState, Suspense } from "react";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { usePathname } from "expo-router";
import { useFonts } from "expo-font";
import { SQLiteProvider } from "expo-sqlite";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as NavigationBar from "expo-navigation-bar";
import { useColorScheme } from "nativewind";
import { themes } from "@/src/theme/tokens";
import { RootLayoutNav } from "../components/navigation/RootLayoutNav";
import { AuthContextProvider } from "../hooks/useSession";
import { AppLoadingScreen } from "@/src/components/common/AppLoadingScreen";
import { QuranBootstrap } from "@/src/features/quran/bootstrap/QuranBootstrap";
import { NotificationBootstrap } from "@/src/components/common/NotificationBootstrap";
import { CelebrationOverlay } from "@/src/components/common/CelebrationOverlay";
import { SyncBootstrap } from "@/src/components/common/SyncBootstrap";
import { warmTranslationsCache } from "@/src/features/quran/services";
import { QURAN_CORE_DB_NAME } from "@/src/lib/db/constants";
import "../global.css";

SplashScreen.preventAutoHideAsync();

function GlobalStatusBar({ isDark }: { isDark: boolean }) {
  const pathname = usePathname();
  const PRIMARY_BG_SCREENS = [
    "/onboarding",
    "/login",
  ];
  const needsLightStatusBar =
    pathname ? PRIMARY_BG_SCREENS.some((p) => pathname.includes(p)) : false;

  return (
    <StatusBar
      style={
        needsLightStatusBar ? "light"
        : isDark ?
          "light"
        : "dark"
      }
      backgroundColor="transparent"
      translucent
    />
  );
}
export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [fontsLoaded] = useFonts({
    Rosemary: require("../../assets/fonts/rosemary.ttf"),
    Uthman: require("../../assets/fonts/uthman.ttf"),
  });
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    warmTranslationsCache();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setBackgroundColorAsync(isDark ? "#0f1512" : "#ffffff");
      NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark");
    }
  }, [isDark]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GlobalStatusBar isDark={isDark} />
      <View
        style={themes[colorScheme ?? "light"]}
        className="flex-1 bg-background"
      >
        <AuthContextProvider>
          <QueryClientProvider client={queryClient}>
            <Suspense fallback={<AppLoadingScreen />}>
              <SQLiteProvider
                databaseName={QURAN_CORE_DB_NAME}
                assetSource={{
                  assetId: require("../../assets/db/quran.sqlite"),
                }}
              >
                <QuranBootstrap>
                  <NotificationBootstrap />
                  <SyncBootstrap />
                  <RootLayoutNav />
                  <CelebrationOverlay />
                </QuranBootstrap>
              </SQLiteProvider>
            </Suspense>
          </QueryClientProvider>
        </AuthContextProvider>
      </View>
    </GestureHandlerRootView>
  );
}
