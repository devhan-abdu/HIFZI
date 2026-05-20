import { Image, View, ActivityIndicator } from "react-native";
import { Text } from "./ui/Text";

export function AppLoadingScreen() {
  return (
    <View className="flex-1 justify-center items-center w-full h-full bg-primary">
      <View className="items-center gap-2 w-full">
        <Image
          source={require("@/assets/images/hifzilogowhite.png")}
          style={{
            width: 120,
            height: 120,
            marginBottom: 12,
          }}
          resizeMode="contain"
        />
         <Text className="text-3xl text-white tracking-[4px] uppercase text-center w-full">
  HIFZI
</Text>

        <View className="mt-1 ">
          <Text className="text-[10px]   text-white/80 uppercase tracking-[4px]">
            Hifz & Muraja
          </Text>
        </View>
        <ActivityIndicator size="small" color="white" className="mt-10" />
      </View>
    </View>
  );
}
