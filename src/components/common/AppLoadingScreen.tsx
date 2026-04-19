import { Image, View, Text, ActivityIndicator } from "react-native";

export function AppLoadingScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-primary">
      <View className="items-center">
        <Image
          source={require("@/assets/images/minilogo.png")}
          style={{
            width: 120,
            height: 120,
            marginBottom: 12,
            tintColor: "white",
          }}
          resizeMode="contain"
        />
        <Text className="text-4xl  text-white tracking-tighter uppercase">
          MINI
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
