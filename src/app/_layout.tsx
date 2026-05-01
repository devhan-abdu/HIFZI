import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { SQLiteProvider } from "expo-sqlite";
import { Suspense } from "react";
import { RootLayoutNav } from "../components/navigation/RootLayoutNav";
import { AuthContextProvider } from "../hooks/useSession";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "../global.css";
import { Platform } from 'react-native';
import { AppLoadingScreen } from "@/src/components/common/AppLoadingScreen";
import { QuranBootstrap } from "@/src/features/quran/bootstrap/QuranBootstrap";
import { NotificationBootstrap } from "@/src/components/common/NotificationBootstrap";
import { QURAN_CORE_DB_NAME } from "@/src/lib/db/constants";
import { CelebrationOverlay } from "@/src/components/common/CelebrationOverlay";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Rosemary: require("../../assets/fonts/rosemary.ttf"),
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

    //  NavigationBar.setBehaviorAsync("overlay-swipe");
    //  NavigationBar.setBackgroundColorAsync("#ffffff00"); // Transparent
    //  NavigationBar.setButtonStyleAsync("dark");
   }, []);

  if (!fontsLoaded) return null;

  return (
    <AuthContextProvider>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<AppLoadingScreen />}>
          <SQLiteProvider
            databaseName={QURAN_CORE_DB_NAME}
            assetSource={{ assetId: require("../../assets/db/quran.sqlite") }}
          >
            <QuranBootstrap>
              <NotificationBootstrap />
              <RootLayoutNav />
              <CelebrationOverlay />
            </QuranBootstrap>
          </SQLiteProvider>
        </Suspense>
      </QueryClientProvider>
    </AuthContextProvider>
  );
}