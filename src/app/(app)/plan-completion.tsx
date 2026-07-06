import React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text } from '@/src/components/common/ui/Text';
import { useLocalSearchParams } from 'expo-router';
import { useNavigate } from '@/src/hooks/useNavigate';
import Screen from '@/src/components/screen/Screen';
import { ScreenContent } from '@/src/components/screen/ScreenContent';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/src/hooks/useSession';
import { murajaService } from '@/src/features/muraja/services/murajaService';
import { hifzService } from '@/src/features/hifz/services/hifzService';
import { usePlanLifecycle } from '@/src/features/habits/hooks/usePlanLifecycle';
import { useLoadSurahData } from '@/src/hooks/useFetchQuran';
import { BADGE_DICTIONARY } from '@/src/features/gamification/constants';
import { BadgeType } from '@/src/services/GamificationService';
import { usePlanCompletionInsights } from '@/src/features/habits/hooks/usePlanCompletionInsights';

const PRIMARY = '#276359';
const PRIMARY_LIGHT = '#e1f5ee';
const PRIMARY_BORDER = 'rgba(39,99,89,0.15)';

export default function PlanCompletionScreen() {
    const { type, id } = useLocalSearchParams<{ type: 'HIFZ' | 'MURAJA'; id: string }>();
    const { push, replace, back } = useNavigate();
    const { user } = useSession();
    const { items: surah } = useLoadSurahData();
    const { markAchievementSeen } = usePlanLifecycle();
    const queryClient = useQueryClient();

    const { data: report, isLoading } = usePlanCompletionInsights(
        user?.id,
        type as 'HIFZ' | 'MURAJA' | undefined,
        id,
        surah
    );

    const isHifz = type === 'HIFZ';

    const getStatusStyle = (statusName: string | undefined) => {
        switch (statusName) {
            case 'Elite':
                return {
                    label: 'Elite Consistency',
                    color: '#0F6E56',
                    bg: '#e1f5ee',
                    border: 'rgba(15,110,86,0.15)'
                };
            case 'Polishing':
                return {
                    label: 'Polishing Needed',
                    color: '#993C1D',
                    bg: '#FAECE7',
                    border: 'rgba(153,60,29,0.15)'
                };
            case 'Recovery':
                return {
                    label: 'Recovery Needed',
                    color: '#B91C1C',
                    bg: '#FEF2F2',
                    border: 'rgba(185,28,28,0.15)'
                };
            default:
                return {
                    label: statusName || 'Active',
                    color: '#0F6E56',
                    bg: '#e1f5ee',
                    border: 'rgba(15,110,86,0.15)'
                };
        }
    };

    const statusStyle = getStatusStyle(report?.status);

    const handleRecycle = async () => {
        if (!user?.id || !id) return;
        try {
            if (type === 'MURAJA') {
                await murajaService.recyclePlan(user.id, parseInt(id));
            } else {
                await hifzService.completePlan(user.id, parseInt(id));
            }
            await markAchievementSeen({ planType: type, localRefId: parseInt(id) });
            await queryClient.invalidateQueries({ queryKey: ['hifz', user.id] });
            await queryClient.invalidateQueries({ queryKey: ['hifz-plan', user.id] });
            await queryClient.invalidateQueries({ queryKey: ['muraja-dashboard', user.id] });
            await queryClient.invalidateQueries({ queryKey: ['activity-plans', user.id] });
            await queryClient.invalidateQueries({ queryKey: ['habit-progress', user.id] });
            await queryClient.invalidateQueries({ queryKey: ['user-stats', user.id] });
            replace('/(app)');
        } catch (e) {
            console.error(e);
        }
    };

    const handleNewPlan = async () => {
        if (!user?.id || !id) return;
        await markAchievementSeen({ planType: type, localRefId: parseInt(id) });
        if (type === 'HIFZ') {
            await hifzService.completePlan(user.id, parseInt(id));
            await queryClient.invalidateQueries({ queryKey: ['hifz', user.id] });
            await queryClient.invalidateQueries({ queryKey: ['hifz-plan', user.id] });
            await queryClient.invalidateQueries({ queryKey: ['activity-plans', user.id] });
            await queryClient.invalidateQueries({ queryKey: ['habit-progress', user.id] });
            push('/(app)/hifz/create-hifz-plan');
        } else {
            await queryClient.invalidateQueries({ queryKey: ['muraja-dashboard', user.id] });
            await queryClient.invalidateQueries({ queryKey: ['activity-plans', user.id] });
            await queryClient.invalidateQueries({ queryKey: ['habit-progress', user.id] });
            push('/(app)/muraja/create-muraja-plan');
        }
    };

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-surface">
                <ActivityIndicator size="large" color={PRIMARY} />
            </View>
        );
    }

    return (
        <Screen className="bg-[#f4f6f5]">
            <ScreenContent>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 48, paddingHorizontal: 16 }}
                >
                    <View className="items-center pt-10 pb-6">
                        <View
                            className="w-[72px] h-[72px] rounded-full items-center justify-center mb-4"
                            style={{ backgroundColor: PRIMARY_LIGHT, borderWidth: 1, borderColor: PRIMARY_BORDER }}
                        >
                            <Ionicons name={isHifz ? 'ribbon' : 'trophy'} size={32} color={PRIMARY} />
                        </View>

                        <View
                            className="px-4 py-1 rounded-full mb-3"
                            style={{ backgroundColor: PRIMARY_LIGHT, borderWidth: 1, borderColor: PRIMARY_BORDER }}
                        >
                            <Text className="text-[11px]  uppercase tracking-widest" style={{ color: '#085041' }}>
                                {report?.pagesRangeStr}
                            </Text>
                        </View>

                        <Text className="text-[22px]  text-center text-text leading-snug px-4">
                            {isHifz ? 'Hifz milestone reached' : 'Revision cycle complete'}
                        </Text>
                        <Text className="text-[13px] text-muted text-center mt-2 px-6 leading-relaxed">
                            {report?.planStartDate && report?.planEndDate
                              ? `${report.planStartDate} → ${report.planEndDate} · `
                              : ""}
                            Stats and badges are for this plan only.
                        </Text>
                    </View>

                    <View className="flex-row gap-2 mb-3">
                        <StatCard
                            value={`${report?.planDurationDays}d`}
                            label="Days to finish"
                            valueColor={PRIMARY}
                        />
                        <StatCard
                            value={`${report?.missedDays}d`}
                            label="Missed"
                            valueColor="#b45309"
                        />
                        <StatCard
                            value={`${report?.avgQuality}/5`}
                            label="Avg retention"
                            valueColor={PRIMARY}
                        />
                    </View>

                    <SectionCard>
                        <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-border">
                            <View className="flex-row items-center gap-2">
                                <Ionicons name="bar-chart" size={15} color={PRIMARY} />
                                <Text className="text-[14px]  text-text">Plan consistency</Text>
                            </View>
                            <View
                                className="px-2.5 py-0.5 rounded-md border"
                                style={{ backgroundColor: statusStyle.bg, borderColor: statusStyle.border }}
                            >
                                <Text className="text-[11px]  capitalize" style={{ color: statusStyle.color }}>
                                    {statusStyle.label}
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row">
                            <View className="flex-1 items-center">
                                <Text className="text-[18px]  text-text">{report?.avgRate}%</Text>
                                <Text className="text-[9px] text-muted uppercase tracking-wider mt-1">Completion</Text>
                            </View>
                            <View className="w-[0.5px] bg-surface self-stretch" />
                            <View className="flex-1 items-center">
                                <Text className="text-[18px]  text-text">{report?.consistencyRate}%</Text>
                                <Text className="text-[9px] text-muted uppercase tracking-wider mt-1">Consistency</Text>
                            </View>
                            <View className="w-[0.5px] bg-surface self-stretch" />
                            <View className="flex-1 items-center">
                                <Text className="text-[18px]  text-text">{report?.totalCompletedPages}</Text>
                                <Text className="text-[9px] text-muted uppercase tracking-wider mt-1">Pages done</Text>
                            </View>
                            <View className="w-[0.5px] bg-surface self-stretch" />
                            <View className="flex-1 items-center">
                                <Text className="text-[18px]  text-text">{report?.completedDays}</Text>
                                <Text className="text-[9px] text-muted uppercase tracking-wider mt-1">Perfect days</Text>
                            </View>
                        </View>
                    </SectionCard>

                    <SectionCard>
                        <View className="flex-row items-center gap-2 mb-3 pb-3 border-b border-border">
                            <Ionicons name="sparkles" size={15} color={PRIMARY} />
                            <Text className="text-[14px]  text-text">AI page retention</Text>
                        </View>

                        {report?.isSingleSurah ? (
                            <View>
                                <Text className="text-[12px] text-muted mb-4 leading-relaxed">
                                    Based on your FSRS memory model, here is your page-level status for Surah{' '}
                                    <Text className=" text-muted">{report?.surahName}</Text>:
                                </Text>

                                <ChipGroup
                                    label="Strong retention"
                                    count={report?.solidPages?.length || 0}
                                    dotColor="#1D9E75"
                                >
                                    {report?.solidPages?.length > 0 ? (
                                        report.solidPages.map((p: any) => (
                                            <PageChip key={p.page} variant="good">
                                                Pg {p.pageInSurah} · {p.retrievability}%
                                            </PageChip>
                                        ))
                                    ) : (
                                        <Text className="text-[12px] text-muted italic">
                                            No mastered pages yet — keep up the consistent review!
                                        </Text>
                                    )}
                                </ChipGroup>

                                <ChipGroup
                                    label="Needs polish"
                                    count={report?.atRiskPages?.length || 0}
                                    dotColor="#D85A30"
                                >
                                    {report?.atRiskPages?.length > 0 ? (
                                        report.atRiskPages.map((p: any) => (
                                            <PageChip key={p.page} variant="risk">
                                                Pg {p.pageInSurah} · {p.retrievability}%
                                            </PageChip>
                                        ))
                                    ) : (
                                        <View
                                            className="flex-row items-center gap-2 p-3 rounded-xl"
                                            style={{ backgroundColor: PRIMARY_LIGHT, borderWidth: 0.5, borderColor: '#9FE1CB' }}
                                        >
                                            <Ionicons name="checkmark-circle" size={15} color="#1D9E75" />
                                            <Text className="text-[12px] flex-1" style={{ color: '#085041' }}>
                                                Zero pages at risk — excellent memory quality!
                                            </Text>
                                        </View>
                                    )}
                                </ChipGroup>
                            </View>
                        ) : (
                            <View>
                                <Text className="text-[12px] text-muted mb-3 leading-relaxed">
                                    Your plan spanned multiple surahs. Here's the retention status by surah:
                                </Text>
                                {report?.surahAnalysis?.map((s: any) => {
                                    const isExcellent = s.status === 'excellent';
                                    const isPolish = s.status === 'polish';
                                    return (
                                        <View key={s.name} className="mb-3 p-3 rounded-xl bg-background border border-border">
                                            <View className="flex-row justify-between items-center mb-3">
                                                <Text className=" text-text text-[13px]">Surah {s.name}</Text>
                                                <View
                                                    className="px-2 py-0.5 rounded-md"
                                                    style={{
                                                        backgroundColor: isExcellent ? '#e1f5ee' : isPolish ? '#FAECE7' : '#E6F1FB',
                                                    }}
                                                >
                                                    <Text
                                                        className="text-[10px]  uppercase"
                                                        style={{ color: isExcellent ? '#0F6E56' : isPolish ? '#993C1D' : '#185FA5' }}
                                                    >
                                                        {isExcellent ? 'Excellent' : isPolish ? 'Polish needed' : 'Good'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <ProgressRow label="Mastered" percent={s.strongPercent} color="#1D9E75" textColor="#0F6E56" />
                                            <View className="mt-2">
                                                <ProgressRow label="At risk" percent={s.weakPercent} color="#D85A30" textColor="#993C1D" />
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </SectionCard>

                    <SectionCard>
                        <View className="flex-row items-center gap-2 mb-3 pb-3 border-b border-border">
                            <Ionicons name="ribbon" size={15} color={PRIMARY} />
                            <Text className="text-[14px]  text-text">Achievements unlocked</Text>
                        </View>

                        {report?.achievedBadges && report.achievedBadges.length > 0 ? (
                            report.achievedBadges.map((badge: any, index: number) => {
                                const badgeDef = BADGE_DICTIONARY[badge.badgeType as BadgeType] || {
                                    title: badge.badgeType.replace(/_/g, ' '),
                                    description: 'An achievement unlocked in your journey.',
                                    icon: 'ribbon',
                                    color: PRIMARY,
                                };
                                return (
                                    <View
                                        key={badge.badgeId}
                                        className="flex-row items-center gap-3 py-3"
                                        style={index < report.achievedBadges.length - 1
                                            ? { borderBottomWidth: 0.5, borderBottomColor: '#f1f5f4' }
                                            : {}}
                                    >
                                        <View
                                            className="w-10 h-10 rounded-full items-center justify-center"
                                            style={{ backgroundColor: `${badgeDef.color}18` }}
                                        >
                                            <Ionicons name={badgeDef.icon as any} size={18} color={badgeDef.color} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-[13px]  text-text">{badgeDef.title}</Text>
                                            <Text className="text-[12px] text-muted mt-0.5 leading-snug">{badgeDef.description}</Text>
                                        </View>
                                    </View>
                                );
                            })
                        ) : (
                            <View
                                className="flex-row items-center gap-3 p-3 rounded-xl"
                                style={{ backgroundColor: '#f8faf9', borderWidth: 0.5, borderColor: '#e2ede9' }}
                            >
                                <Ionicons name="sparkles" size={16} color={PRIMARY} />
                                <Text className="text-[12px] text-muted flex-1 leading-relaxed">
                                    No milestones unlocked this plan. Stay consistent on your next cycle to earn streak badges!
                                </Text>
                            </View>
                        )}
                    </SectionCard>

                    <Text className="text-[10px] text-muted uppercase tracking-[2px] mb-3 mt-2 px-0.5">
                        Choose next path
                    </Text>

                    <Pressable
                        onPress={handleRecycle}
                        className="bg-surface rounded-2xl border border-border flex-row items-center justify-between p-4 mb-2 active:bg-background"
                    >
                        <View className="flex-row items-center gap-3">
                            <View
                                className="w-10 h-10 rounded-xl items-center justify-center"
                                style={{ backgroundColor: PRIMARY_LIGHT }}
                            >
                                <Ionicons name="refresh" size={20} color={PRIMARY} />
                            </View>
                            <View>
                                <Text className="text-[14px] " style={{ color: PRIMARY }}>
                                    {isHifz ? 'Review & strengthen range' : 'Restart same cycle'}
                                </Text>
                                <Text className="text-[12px] text-muted mt-0.5">Maintain and solidify current progress</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={PRIMARY} />
                    </Pressable>

                    <Pressable
                        onPress={handleNewPlan}
                        className="rounded-2xl flex-row items-center justify-between p-4 mb-2 active:opacity-90"
                        style={{ backgroundColor: PRIMARY }}
                    >
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 rounded-xl items-center justify-center bg-surface/15">
                                <Ionicons name="add" size={20} color="white" />
                            </View>
                            <View>
                                <Text className="text-[14px]  text-white">
                                    {isHifz ? 'New memorization range' : 'Create new review plan'}
                                </Text>
                                <Text className="text-[12px] text-white/70 mt-0.5">Start fresh with new targets</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="white" />
                    </Pressable>

                    <TouchableOpacity onPress={() => back()} className="items-center py-4">
                        <Text className="text-[13px] text-muted">Dismiss for now</Text>
                    </TouchableOpacity>
                </ScrollView>
            </ScreenContent>
        </Screen>
    );
}


function StatCard({ value, label, valueColor }: { value: string; label: string; valueColor: string }) {
    return (
        <View className="flex-1 bg-surface rounded-2xl border border-border p-4 items-center">
            <Text className="text-[18px] " style={{ color: valueColor }}>{value}</Text>
            <Text className="text-[10px] text-muted uppercase tracking-wider mt-1 text-center">{label}</Text>
        </View>
    );
}

function SectionCard({ children }: { children: React.ReactNode }) {
    return (
        <View className="bg-surface rounded-3xl border border-border p-4 mb-3">
            {children}
        </View>
    );
}

function ChipGroup({
    label,
    count,
    dotColor,
    children,
}: {
    label: string;
    count: number;
    dotColor: string;
    children: React.ReactNode;
}) {
    return (
        <View className="mb-4 last:mb-0">
            <View className="flex-row items-center gap-2 mb-2">
                <View className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
                <Text className="text-[12px]  text-muted">{label}</Text>
                <Text className="text-[11px] text-muted">({count})</Text>
            </View>
            <View className="flex-row flex-wrap" style={{ margin: -3 }}>
                {children}
            </View>
        </View>
    );
}

function PageChip({ variant, children }: { variant: 'good' | 'risk'; children: React.ReactNode }) {
    const isGood = variant === 'good';
    return (
        <View
            className="rounded-full px-3 py-1 m-[3px]"
            style={{
                backgroundColor: isGood ? '#e1f5ee' : '#FAECE7',
                borderWidth: 0.5,
                borderColor: isGood ? '#9FE1CB' : '#F5C4B3',
            }}
        >
            <Text className="text-[12px] " style={{ color: isGood ? '#085041' : '#993C1D' }}>
                {children}
            </Text>
        </View>
    );
}

function ProgressRow({
    label,
    percent,
    color,
    textColor,
}: {
    label: string;
    percent: number;
    color: string;
    textColor: string;
}) {
    return (
        <View>
            <View className="flex-row justify-between items-center mb-1">
                <Text className="text-[10px] text-muted">{label}</Text>
                <Text className="text-[11px] " style={{ color: textColor }}>{percent}%</Text>
            </View>
            <View className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                <View className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
            </View>
        </View>
    );
}