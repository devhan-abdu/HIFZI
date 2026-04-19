import {
  createMaterialTopTabNavigator,
  MaterialTopTabNavigationOptions,
  MaterialTopTabNavigationEventMap
} from "@react-navigation/material-top-tabs";
import {  withLayoutContext } from "expo-router";
import { ParamListBase, TabNavigationState } from "@react-navigation/native";


const {Navigator} = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);


export default function MurajaMainLayout() {
  return (
    <MaterialTopTabs
      screenOptions={{
        tabBarActiveTintColor: "#276359",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarPressColor: "transparent",
        tabBarIndicatorStyle: {
          backgroundColor: "#276359",
          height: 3,
          borderRadius: 10,
          bottom: 0,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontFamily: "Rosemary",
          textTransform: "capitalize",
          color: "black",
        },
        tabBarStyle: {
          backgroundColor: "#fff",
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: "#f1f5f9",
          marginHorizontal: 10,
        },
        tabBarItemStyle: {
          width: "auto",
          minWidth: 80,
        },
      }}
    >
      <MaterialTopTabs.Screen name="index" options={{ title: "Muraja" }} />
      <MaterialTopTabs.Screen name="[review]" options={{ title: "Review" }} />
      <MaterialTopTabs.Screen name="history" options={{ title: "History" }} />
    </MaterialTopTabs>
  );
}
