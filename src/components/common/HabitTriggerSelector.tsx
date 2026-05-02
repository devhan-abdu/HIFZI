import React, { useState } from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from './ui/Text';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

const TRIGGERS = [
  { id: 'fajr', label: 'After Fajr', icon: 'sunny-outline' },
  { id: 'dhuhr', label: 'After Dhuhr', icon: 'sunny' },
  { id: 'asr', label: 'After Asr', icon: 'partly-sunny' },
  { id: 'maghrib', label: 'After Maghrib', icon: 'moon-outline' },
  { id: 'isha', label: 'After Isha', icon: 'moon' },
  { id: 'custom', label: 'Custom Time', icon: 'time-outline' },
];

interface HabitTriggerSelectorProps {
  value: string | null;
  onChange: (value: string) => void;
  isCustom: boolean;
  setIsCustom: (val: boolean) => void;
  error?: string;
}

export const HabitTriggerSelector = ({ value, onChange, isCustom, setIsCustom, error }: HabitTriggerSelectorProps) => {
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleSelect = (id: string) => {
    if (id === 'custom') {
      setIsCustom(true);
      setShowTimePicker(true);
    } else {
      setIsCustom(false);
      onChange(id);
    }
  };

  const onTimeChange = (event: any, date?: Date) => {
    setShowTimePicker(false);
    if (date) {
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      onChange(timeStr);
    }
  };

  return (
    <View className="mb-6">
      <View className="flex-row items-center mb-4 ml-1">
        <Text className="text-slate-400 text-[10px] uppercase  tracking-[2px]">
          Habit Trigger
        </Text>
      </View>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View className="flex-row gap-3 px-1">
          {TRIGGERS.map((trigger) => {
            const isSelected = (trigger.id === 'custom' && isCustom) || (value === trigger.id && !isCustom);
            
            return (
              <Pressable
                key={trigger.id}
                onPress={() => handleSelect(trigger.id)}
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
                className={`flex-row items-center px-5 py-3.5 rounded-full ${
                  isSelected 
                    ? 'bg-primary' 
                    : 'bg-slate-100'
                }`}
              >
                <Ionicons 
                  name={trigger.icon as any} 
                  size={18} 
                  color={isSelected ? '#ffffff' : '#64748b'} 
                />
                <Text className={`ml-2 text-sm font-semibold tracking-tight ${
                  isSelected ? 'text-white' : 'text-slate-600'
                }`}>
                  {trigger.id === 'custom' && isCustom && value && !TRIGGERS.find(t => t.id === value) 
                    ? value 
                    : trigger.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {showTimePicker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          is24Hour={false}
          onChange={onTimeChange}
        />
      )}

      {error && (
        <Text className="text-xs text-red-500 mt-2 ml-1">{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  }
});
