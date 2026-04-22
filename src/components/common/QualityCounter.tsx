import React from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { Ionicons } from "@expo/vector-icons";

interface QualityCounterProps {
  label: string;
  description: string;
  value: number;
  onValueChange: (value: number) => void;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export const QualityCounter = ({
  label,
  description,
  value,
  onValueChange,
  icon,
  color,
}: QualityCounterProps) => {
  return (
    <View className="bg-gray-50 p-6 rounded-[28px] border border-gray-100 flex-row items-center justify-between">
      <View className="flex-1">
        <View className="flex-row items-center mb-1">
          <Ionicons name={icon} size={18} color={color} />
          <Text className="text-gray-900 text-lg ml-2">{label}</Text>
        </View>
        <Text className="text-gray-400 text-xs">{description}</Text>
      </View>
      
      <View className="flex-row items-center bg-white rounded-2xl p-1.5 border border-gray-200">
        <Pressable
          onPress={() => onValueChange(Math.max(0, value - 1))}
          className="w-10 h-10 items-center justify-center active:bg-gray-50 rounded-xl"
        >
          <Ionicons name="remove" size={20} color="#64748b" />
        </Pressable>
        
        <View className="w-10 items-center">
          <Text className="text-2xl font-bold text-gray-900">{value}</Text>
        </View>
        
        <Pressable
          onPress={() => onValueChange(value + 1)}
          className="w-10 h-10 items-center justify-center active:bg-gray-50 rounded-xl"
        >
          <Ionicons name="add" size={20} color={color} />
        </Pressable>
      </View>
    </View>
  );
};
