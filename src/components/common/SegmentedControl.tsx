import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/src/components/common/ui/Text';
import { cn } from '@/src/lib/utils';

interface SegmentedControlProps {
  options: string[];
  selectedOption: string;
  onOptionPress: (option: string) => void;
  className?: string;
}

export const SegmentedControl = ({
  options,
  selectedOption,
  onOptionPress,
  className,
}: SegmentedControlProps) => {
  return (
    <View className={cn("flex-row bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50", className)}>
      {options.map((option) => {
        const isSelected = selectedOption === option;
        return (
          <Pressable
            key={option}
            onPress={() => onOptionPress(option)}
            className={cn(
              "flex-1 py-2.5 rounded-xl items-center justify-center",
              isSelected ? "bg-white shadow-sm" : "bg-transparent"
            )}
          >
            <Text
              className={cn(
                "text-[11px]  uppercase tracking-widest",
                isSelected ? "text-primary" : "text-slate-500"
              )}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};
