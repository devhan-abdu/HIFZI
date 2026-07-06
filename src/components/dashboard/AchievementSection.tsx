import React, { useState } from 'react';
import { View, ScrollView, Pressable, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../common/ui/Text';
import { BadgeType } from '@/src/services/GamificationService';
import { BADGE_DICTIONARY } from '@/src/features/gamification/constants';

type Badge = {
  badgeId: string;
  badgeType: string;
  achievedAt: string;
};

type AchievementSectionProps = {
  badges: Badge[];
};

export function AchievementSection({ badges }: AchievementSectionProps) {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  if (badges.length === 0) return null;

  return (
    <View className="mb-6">
      <Text className="text-muted uppercase tracking-[2px] text-[10px] mb-8 px-1">
        Your Achievements
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 4 }}
      >
        {badges.map((badge) => {
          const badgeDef = BADGE_DICTIONARY[badge.badgeType as BadgeType] || {
            title: badge.badgeType.replace(/_/g, ' '),
            description: "An achievement unlocked in your journey.",
            icon: "ribbon",
            color: "#276359"
          };

          return (
            <Pressable 
              key={badge.badgeId}
              onPress={() => setSelectedBadge(badge)}
              className="mr-3 bg-surface border border-border rounded-xl p-3 flex-row items-center shadow-sm"
            >
              <View 
                className="w-8 h-8 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: `${badgeDef.color}15` }}
              >
                <Ionicons name={badgeDef.icon as any} size={16} color={badgeDef.color} />
              </View>
              <View>
                <Text className="text-text text-xs capitalize ">
                  {badgeDef.title}
                </Text>
                <Text className="text-muted text-[9px] uppercase tracking-tighter mt-0.5">
                  Unlocked
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal
        visible={!!selectedBadge}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}
      >
        <TouchableOpacity 
          className="flex-1 bg-black/60 justify-center items-center px-6"
          activeOpacity={1}
          onPress={() => setSelectedBadge(null)}
        >
          {selectedBadge && (() => {
            const def = BADGE_DICTIONARY[selectedBadge.badgeType as BadgeType] || {
              title: selectedBadge.badgeType.replace(/_/g, ' '),
              description: "An achievement unlocked in your journey.",
              icon: "ribbon",
              color: "hsla(170, 44%, 27%, 1.00)"
            };

            return (
              <TouchableOpacity 
                activeOpacity={1} 
                className="bg-surface w-full rounded-3xl p-8 items-center shadow-2xl"
              >
                <View 
                  className="w-20 h-20 rounded-full items-center justify-center mb-6"
                  style={{ backgroundColor: `${def.color}15` }}
                >
                  <Ionicons name={def.icon as any} size={40} color={def.color} />
                </View>
                
                <Text className="text-2xl  text-text mb-2 text-center">
                  {def.title}
                </Text>
                
                <Text className="text-muted text-center text-sm leading-6 mb-8">
                  {def.description}
                </Text>

                <Pressable 
                  onPress={() => setSelectedBadge(null)}
                  className="w-full bg-primary  py-4 rounded-xl items-center"
                >
                  <Text className="text-primary-foreground ">Continue</Text>
                </Pressable>
              </TouchableOpacity>
            );
          })()}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
