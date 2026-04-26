import { Image, View, Text, ActivityIndicator } from "react-native";

export function AppLoadingScreen() {
  return (
    <View className="flex-1 justify-center items-center w-full h-full bg-primary">
      <View className="items-center gap-2 w-full">
        <Image
          source={require("@/assets/images/minilogo.png")}
          style={{
            width: 130,
            height: 130,
            marginBottom: 12,
            tintColor: "white",
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
