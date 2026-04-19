import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const QuickNav = () => (
  <View className="">
    <Text className="text-lg font-bold mb-4">Quick Navigation</Text>
    <View className="flex-row space-x-4">
      <TouchableOpacity className="flex-1 bg-gray-100 p-4 rounded-2xl items-center">
        <Ionicons name="list" size={24} color="#276359" />
        <Text className="mt-2 font-medium">Surah List</Text>
      </TouchableOpacity>
      <TouchableOpacity className="flex-1 bg-gray-100 p-4 rounded-2xl items-center">
        <Ionicons name="grid" size={24} color="#276359" />
        <Text className="mt-2 font-medium">Juz Index</Text>
      </TouchableOpacity>
    </View>
  </View>
);
