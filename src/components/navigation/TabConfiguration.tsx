import { TextStyle } from "react-native";
import { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";



export function getTabsScreenOptions(
  hideTabs: boolean,
  activeColor: string,
  inactiveColor: string,
  tabBgColor: string,
  shadowColor: string,
  bottomInset: number,
  tabBarHeight: number,
): BottomTabNavigationOptions {
  return {
    tabBarActiveTintColor: activeColor,
    tabBarInactiveTintColor: inactiveColor,
    tabBarStyle: hideTabs
      ? { display: "none" }
      : {
          backgroundColor: tabBgColor,
          borderRadius: 32,
          marginHorizontal: 16,
          height: tabBarHeight,
          paddingBottom: 4,
          paddingTop: 4,
          position: "absolute",
          borderTopWidth: 0,
          elevation: 32,
          zIndex: 100,
          shadowColor: shadowColor,
          shadowOpacity: 0.18,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: -2 },
          bottom: Math.max(bottomInset, 8) + 8,
        },
    tabBarLabelStyle: {
      fontSize: 9,
      fontFamily: "Rosemary",
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginTop: 2,
    } as TextStyle,
    tabBarIconStyle: {
      marginTop: 2,
    },
    headerShown: false,
  };
}


