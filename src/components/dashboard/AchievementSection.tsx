import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Badge = {
  badgeId: string;
  badgeType: string;
  achievedAt: string;
};

type AchievementSectionProps = {
  badges: Badge[];
};

export function AchievementSection({ badges }: AchievementSectionProps) {
  if (badges.length === 0) return null;

  return (
    <View className="mb-8">
      <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] mb-3 px-1">
        Your Achievements
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 4 }}
      >
        {badges.map((badge) => (
          <Pressable 
            key={badge.badgeId}
            className="mr-3 bg-white border border-slate-100 rounded-2xl p-3 flex-row items-center shadow-sm"
          >
            <View className="w-8 h-8 bg-primary/5 rounded-full items-center justify-center mr-3">
              <Ionicons name="ribbon" size={16} color="#276359" />
            </View>
            <View>
              <Text className="text-slate-900 text-xs  capitalize">
                {badge.badgeType.replace('BADGE_', '').toLowerCase()}
              </Text>
              <Text className="text-slate-400 text-[9px] uppercase tracking-tighter">
                Unlocked
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
