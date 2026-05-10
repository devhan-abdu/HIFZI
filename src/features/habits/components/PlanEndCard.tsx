
import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/src/components/common/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface PlanEndCardProps {
    activityType: 'HIFZ' | 'MURAJA';
    localRefId: number;
    title?: string;
    onClose?: () => void;
}

export const PlanEndCard: React.FC<PlanEndCardProps> = ({ activityType, localRefId, title, onClose }) => {
    const isHifz = activityType === 'HIFZ';
    
    return (
        <Pressable 
            onPress={() => router.push(`/(app)/plan-completion?type=${activityType}&id=${localRefId}`)}
            className="mb-6 overflow-hidden"
        >
            <View className="p-7 rounded-[40px] bg-white relative shadow-2xl shadow-slate-200 border border-slate-200 overflow-hidden">
                {/* Achievement Glow Decoration */}
                <View className="absolute -right-6 -bottom-6 w-32 h-32 bg-amber-400/20 border border-amber-300 rounded-full" />
                <View className="absolute -right-12 -bottom-12 w-48 h-48 bg-amber-50/50 rounded-full" />

                <View className="flex-row items-center justify-between mb-6">
                    <View className="bg-amber-100 px-4 py-1.5 rounded-full border border-amber-200">
                        <Text className="text-[10px] text-amber-700 font-bold uppercase tracking-[2px]">
                            {isHifz ? 'Milestone Reached' : 'Cycle Completed'}
                        </Text>
                    </View>
                    {onClose && (
                        <Pressable onPress={(e) => {
                            e.stopPropagation();
                            onClose();
                        }} className="p-2 bg-slate-100 rounded-full">
                            <Ionicons name="close" size={16} color="#64748b" />
                        </Pressable>
                    )}
                </View>

                <View className="flex-row items-center gap-4 mb-4">
                    <View className="w-14 h-14 bg-white border border-amber-200 rounded-full items-center justify-center shadow-lg shadow-amber-200/40">
                         <Ionicons name={isHifz ? "ribbon" : "trophy"} size={28} color="#d97706" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-slate-900 text-2xl font-bold tracking-tight">
                            {isHifz ? 'Mubarak! Hifz Goal' : 'Alhamdulillah! Complete'}
                        </Text>
                        <Text className="text-slate-400 text-xs uppercase tracking-widest mt-1">Journey Achievement</Text>
                    </View>
                </View>
                
                <Text className="text-slate-600 text-sm leading-6 mb-8 max-w-[90%]">
                    {isHifz 
                        ? `You've successfully reached your target for ${title || 'this range'}. Your consistency has been exceptional.`
                        : `Your revision journey is complete. Let's see your final performance insights.`}
                </Text>

                <View className="flex-row items-center bg-primary self-start px-6 py-3 rounded-2xl shadow-sm shadow-primary/30">
                    <Text className="text-white font-bold mr-3 tracking-tight">Review Journey Insights</Text>
                    <Ionicons name="arrow-forward" size={18} color="white" />
                </View>
            </View>
        </Pressable>
    );
};
