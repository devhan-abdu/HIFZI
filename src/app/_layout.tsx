import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { SQLiteProvider } from "expo-sqlite";
import { Suspense } from "react";
import { RootLayoutNav } from "../components/navigation/RootLayoutNav";
import { AuthContextProvider } from "../hooks/useSession";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "../global.css";
import * as NavigationBar from "expo-navigation-bar";
import { Platform } from 'react-native';
import { AppLoadingScreen } from "@/src/components/common/AppLoadingScreen";
import { QuranBootstrap } from "@/src/features/quran/bootstrap/QuranBootstrap";
import { QuranStateDatabaseProvider } from "@/src/lib/db/QuranStateDatabaseProvider";



SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Amiri: require("../../assets/fonts/AmiriQuran.ttf"),
    Rosemary: require("../../assets/fonts/Rosemary.ttf"),
    Uthman: require("../../assets/fonts/uthman.ttf"),
  });
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    NavigationBar.setPositionAsync("absolute");
    NavigationBar.setBackgroundColorAsync("#ffffff00");
    NavigationBar.setButtonStyleAsync("dark");
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthContextProvider>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<AppLoadingScreen />}>
          <SQLiteProvider
            databaseName="quran_v4.db"
            assetSource={{ assetId: require("../../assets/db/quran.sqlite") }}
            useSuspense
          >
            <QuranStateDatabaseProvider>
              <QuranBootstrap>
                <RootLayoutNav />
              </QuranBootstrap>
            </QuranStateDatabaseProvider>
          </SQLiteProvider>
        </Suspense>
      </QueryClientProvider>
    </AuthContextProvider>
  );
}
