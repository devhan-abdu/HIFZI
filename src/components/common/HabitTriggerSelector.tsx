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
      <Text className="text-gray-400 text-[10px] uppercase mb-3 ml-1 tracking-widest font-bold">
        Habit Trigger (Habit Stacking)
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View className="flex-row gap-3">
          {TRIGGERS.map((trigger) => {
            const isSelected = (trigger.id === 'custom' && isCustom) || (value === trigger.id && !isCustom);
            
            return (
              <Pressable
                key={trigger.id}
                onPress={() => handleSelect(trigger.id)}
                className={`flex-row items-center px-4 py-3 rounded-2xl border ${
                  isSelected 
                    ? 'bg-primary/10 border-primary' 
                    : 'bg-white border-gray-100'
                }`}
              >
                <Ionicons 
                  name={trigger.icon as any} 
                  size={18} 
                  color={isSelected ? '#276359' : '#94a3b8'} 
                />
                <Text className={`ml-2 text-sm font-medium ${
                  isSelected ? 'text-primary' : 'text-slate-600'
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
    paddingHorizontal: 4,
    paddingVertical: 2,
  }
});
