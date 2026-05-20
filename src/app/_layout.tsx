import { useEffect, useState, Suspense } from "react";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { SQLiteProvider } from "expo-sqlite";
import { Platform, View } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as NavigationBar from "expo-navigation-bar";

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

export default function RootLayout() {
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
      NavigationBar.setBackgroundColorAsync("#000000");
      NavigationBar.setButtonStyleAsync("light");
    }
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <StatusBar style="light" backgroundColor="#000000" />

      <View style={{ flex: 1, backgroundColor: "#000000" }}>
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
    </>
  );
}