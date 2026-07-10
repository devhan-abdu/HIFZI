import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const QuickNav = () => (
  <View className="">
    <Text className="text-lg  mb-4">Quick Navigation</Text>
    <View className="flex-row space-x-4">
      <TouchableOpacity className="flex-1 bg-surface dark:bg-surface-muted p-4 rounded-2xl items-center border border-border dark:border-white/10">
        <Ionicons name="list" size={24} color="#276359" />
        <Text className="mt-2 ">Surah List</Text>
      </TouchableOpacity>
      <TouchableOpacity className="flex-1 bg-surface dark:bg-surface-muted p-4 rounded-2xl items-center border border-border dark:border-white/10">
        <Ionicons name="grid" size={24} color="#276359" />
        <Text className="mt-2 ">Juz Index</Text>
      </TouchableOpacity>
    </View>
  </View>
);
