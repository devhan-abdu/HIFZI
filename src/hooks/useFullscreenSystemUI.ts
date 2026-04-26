import { useCallback } from "react";
import { Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import { useFocusEffect } from "expo-router";

export function useFullscreenSystemUI(enabled: boolean) {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;

      let isMounted = true;

      const enterFullscreen = async () => {
        try {
          //     await NavigationBar.setBehaviorAsync("overlay-swipe");
          //     await NavigationBar.setBackgroundColorAsync("#00000000");
          // await NavigationBar.setVisibilityAsync("hidden");
         
        } catch (e) {
          console.warn("Failed to enter fullscreen:", e);
        }
      };

      const exitFullscreen = async () => {
        try {
          await NavigationBar.setVisibilityAsync("visible");
          await NavigationBar.setBehaviorAsync("inset-swipe");
          await NavigationBar.setBackgroundColorAsync("#ffffff");
        } catch (e) {
          console.warn("Failed to exit fullscreen:", e);
        }
      };

      if (enabled && isMounted) {
        enterFullscreen();
      }

      return () => {
        isMounted = false;
        exitFullscreen()
      };
    }, [enabled])
  );
}