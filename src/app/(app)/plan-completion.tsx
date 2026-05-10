
import React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/src/components/common/ui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Screen from '@/src/components/screen/Screen';
import { ScreenContent } from '@/src/components/screen/ScreenContent';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/src/hooks/useSession';
import { murajaService } from '@/src/features/muraja/services/murajaService';
import { hifzService } from '@/src/features/hifz/services/hifzService';
import { usePlanLifecycle } from '@/src/features/habits/hooks/usePlanLifecycle';
import { hifzStatus } from '@/src/features/hifz/utils/plan-status';
import { computeWeeklyReview } from '@/src/features/muraja/utils/murajaAnalytics';
import { useLoadSurahData } from '@/src/hooks/useFetchQuran';
import { Button } from '@/src/components/ui/Button';
import { differenceInDays } from 'date-fns';

export default function PlanCompletionScreen() {
    const { type, id } = useLocalSearchParams<{ type: 'HIFZ' | 'MURAJA'; id: string }>();
    const router = useRouter();
    const { user } = useSession();
    const { items: surah } = useLoadSurahData();
    const { markAchievementSeen } = usePlanLifecycle();
    const queryClient = useQueryClient();

    const { data: report, isLoading } = useQuery({
        queryKey: ['plan-completion-insights', type, id, user?.id],
        queryFn: async () => {
            if (!user?.id || !id || !surah) return null;
            if (type === 'HIFZ') {
                const plan = await hifzService.getPlan(user.id, parseInt(id));
                const status = hifzStatus(plan, surah);
                if (!status) return null;
                
                return {
                    avgRate: status.accuracy,
                    avgQuality: status.avgQuality,
                    completedDays: status.completedDays,
                    partialDays: status.partialDays,
                    totalCompletedPages: status.completedPages,
                    planDurationDays: differenceInDays(new Date(), new Date(status.startDate)) + 1,
                    status: status.accuracy >= 90 ? 'Elite' : status.accuracy >= 70 ? 'Polishing' : 'Recovery',
                };
            } else {
                const plan = await murajaService.getPlanById(user.id, parseInt(id));
                if (!plan) return null;
                const status = computeWeeklyReview(plan);
                
                return {
                    avgRate: status.completionRate,
                    avgQuality: status.avgQuality,
                    completedDays: status.completedDays,
                    partialDays: status.partialDays,
                    totalCompletedPages: status.totalPages,
                    planDurationDays: differenceInDays(new Date(), new Date(status.startDate)) + 1,
                    status: status.completionRate >= 90 ? 'Elite' : status.completionRate >= 70 ? 'Polishing' : 'Recovery',
                };
            }
        },
        enabled: !!user?.id && !!id && !!surah
    });

    const isHifz = type === 'HIFZ';

    const handleRecycle = async () => {
        if (!user?.id || !id) return;
        try {
            if (type === 'MURAJA') {
                await murajaService.recyclePlan(user.id, parseInt(id));
            } else {
                await hifzService.completePlan(user.id, parseInt(id));
            }
            await markAchievementSeen({ planType: type, localRefId: parseInt(id) });
            queryClient.invalidateQueries();
            router.replace("/(app)");
        } catch (e) {
            console.error(e);
        }
    };

    const handleNewPlan = async () => {
        if (!user?.id || !id) return;
        await markAchievementSeen({ planType: type, localRefId: parseInt(id) });
        if (type === 'HIFZ') {
            await hifzService.completePlan(user.id, parseInt(id));
            router.push("/(app)/hifz/create-hifz-plan");
        } else {
            router.push("/(app)/muraja/create-muraja-plan");
        }
    };

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#276359" />
            </View>
        );
    }

    return (
        <Screen className="bg-white">
            <ScreenContent>
                <View className="flex-1 justify-between pb-10">
                    <View>
                        <View className="items-center justify-center py-12">
                            <View className="p-6 rounded-[40px] mb-6 bg-[#276359]/5">
                                <Ionicons 
                                    name={isHifz ? "ribbon" : "trophy"} 
                                    size={64} 
                                    color="#276359" 
                                />
                            </View>
                            <Text className="text-3xl font-bold text-center px-6 text-[#276359]">
                                {isHifz ? 'Mubarak!\nHifz Milestone' : 'Revision Cycle\nComplete'}
                            </Text>
                            <Text className="text-[#276359]/40 text-center mt-4 px-10 leading-6">
                                You have successfully reached your target. Here is your performance summary for this plan.
                            </Text>
                        </View>
                        
                        {/* Achievement Card */}
                        <View className="bg-[#276359]/5 p-6 rounded-[32px] border border-[#276359]/10 mb-8">
                            <View className="flex-row justify-between mb-8">
                                <View className="items-center flex-1">
                                    <Text className="text-2xl font-bold text-[#276359]">{report?.avgRate}%</Text>
                                    <Text className="text-[#276359]/30 text-[10px] uppercase tracking-widest mt-1 font-bold">Completion</Text>
                                </View>
                                <View className="w-[1px] h-10 bg-[#276359]/10" />
                                <View className="items-center flex-1">
                                    <Text className="text-2xl font-bold text-[#276359]">{report?.avgQuality}/5</Text>
                                    <Text className="text-[#276359]/30 text-[10px] uppercase tracking-widest mt-1 font-bold">Retention</Text>
                                </View>
                                <View className="w-[1px] h-10 bg-[#276359]/10" />
                                <View className="items-center flex-1">
                                    <Text className="text-2xl font-bold text-[#276359]">
                                        {report?.completedDays}
                                    </Text>
                                    <Text className="text-[#276359]/30 text-[10px] uppercase tracking-widest mt-1 font-bold">Perfects</Text>
                                </View>
                            </View>

                            <View className="p-4 rounded-2xl bg-white border border-[#276359]/10 shadow-sm">
                                <View className="flex-row items-start gap-3">
                                    <Ionicons name="medal-outline" size={20} color="#276359" />
                                    <View className="flex-1">
                                        <Text className="text-[#276359] font-bold mb-1">Plan Summary</Text>
                                        <Text className="text-[#276359]/70 text-sm leading-5">
                                            Over the last {report?.planDurationDays} days, you completed {report?.totalCompletedPages} pages with {report?.status} consistency.
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Next Steps */}
                    <View className="gap-y-4">
                        <Text className="text-[#276359]/40 text-[10px] uppercase tracking-[2px] mb-2 px-2 font-bold">Next Path</Text>
                        
                        <Pressable 
                            onPress={handleRecycle}
                            className="bg-white p-5 rounded-[24px] border border-[#276359]/10 flex-row items-center justify-between shadow-sm"
                        >
                            <View className="flex-row items-center gap-4">
                                <View className="w-12 h-12 rounded-2xl items-center justify-center bg-[#276359]/5">
                                    <Ionicons name="refresh" size={24} color="#276359" />
                                </View>
                                <View>
                                    <Text className="text-[#276359] font-bold">
                                        {isHifz ? 'Review Range' : 'Restart Cycle'}
                                    </Text>
                                    <Text className="text-[#276359]/50 text-xs">Maintain current progress</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#276359/20" />
                        </Pressable>

                        <Pressable 
                            onPress={handleNewPlan}
                            className="bg-[#276359] p-5 rounded-[24px] flex-row items-center justify-between shadow-sm"
                        >
                            <View className="flex-row items-center gap-4">
                                <View className="w-12 h-12 rounded-2xl items-center justify-center bg-white/20">
                                    <Ionicons name="add" size={24} color="white" />
                                </View>
                                <View>
                                    <Text className="text-white font-bold">
                                        {isHifz ? 'New Memorization Range' : 'Create New Plan'}
                                    </Text>
                                    <Text className="text-white/70 text-xs">Start fresh with new targets</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="white" />
                        </Pressable>

                        <Button 
                            variant="ghost" 
                            onPress={() => router.back()}
                            className="mt-2"
                            textClassName="text-[#276359]/30"
                        >
                            Dismiss for now
                        </Button>
                    </View>
                </View>
            </ScreenContent>
        </Screen>
    );
}
