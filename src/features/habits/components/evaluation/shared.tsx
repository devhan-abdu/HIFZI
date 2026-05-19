import { Text } from "@/src/components/common/ui/Text";
import { Button } from "@/src/components/ui/Button";
import { cn } from "@/src/lib/utils";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { View } from "react-native";

export function EvaluationHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <View className="mb-8">
      <Text className="text-[10px] uppercase tracking-[1.8px] text-slate-500">
        {eyebrow}
      </Text>
      <Text className="mt-2 text-3xl text-slate-900">{title}</Text>
      <Text className="mt-2 text-sm leading-6 text-slate-500">{description}</Text>
    </View>
  );
}

export function SectionCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <View className={cn("rounded-[32px] border border-slate-100 bg-white p-6", className)}>{children}</View>;
}

export function MetricTile({
  label,
  value,
  accent = "slate",
}: {
  label: string;
  value: string;
  accent?: "slate" | "primary" | "amber" | "rose";
}) {
  const accents = {
    slate: "text-slate-900",
    primary: "text-primary",
    amber: "text-amber-700",
    rose: "text-rose-700",
  } as const;

  return (
    <View className="min-w-[46%] flex-1 rounded-3xl border border-slate-100 bg-slate-50 px-4 py-5">
      <Text className="text-[10px] uppercase tracking-[1.5px] text-slate-400">{label}</Text>
      <Text className={cn("mt-2 text-2xl", accents[accent])}>{value}</Text>
    </View>
  );
}

export function ExamGateCard({
  title,
  description,
  buttonLabel,
  onPress,
  headerTone = "rose",
  disabled = false,
  footerNote,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  onPress: () => void;
  headerTone?: "rose" | "amber" | "primary";
  disabled?: boolean;
  footerNote?: string;
}) {
  const tones = {
    rose: {
      wrap: "border-rose-100 bg-rose-50",
      badge: "bg-rose-600",
      icon: "#e11d48",
      title: "text-rose-900",
      body: "text-rose-700",
    },
    amber: {
      wrap: "border-amber-100 bg-amber-50",
      badge: "bg-amber-500",
      icon: "#d97706",
      title: "text-amber-900",
      body: "text-amber-700",
    },
    primary: {
      wrap: "border-primary/10 bg-primary/5",
      badge: "bg-primary",
      icon: "#276359",
      title: "text-primary",
      body: "text-slate-600",
    },
  } as const;

  const tone = tones[headerTone];

  return (
    <SectionCard className={tone.wrap}>
      <View className="mb-5 flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <Text className={cn("text-[10px] uppercase tracking-[1.6px]", tone.body)}>Assessment Gate</Text>
          <Text className={cn("mt-2 text-xl", tone.title)}>{title}</Text>
        </View>
        <View className={cn("rounded-full px-3 py-1.5", tone.badge)}>
          <Text className="text-[10px] uppercase tracking-[1.4px] text-white">Exam</Text>
        </View>
      </View>

      <Text className={cn("mb-5 text-sm leading-6", tone.body)}>{description}</Text>

      <Button onPress={onPress} className="h-14 bg-white" variant="outline" disabled={disabled}>
        {buttonLabel}
      </Button>

      {footerNote ? <Text className={cn("mt-4 text-xs leading-5", tone.body)}>{footerNote}</Text> : null}
    </SectionCard>
  );
}

export function LockedRecommendationCard({ message }: { message: string }) {
  return (
    <SectionCard className="items-center border-dashed py-8">
      <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-slate-50">
        <Ionicons name="lock-closed" size={22} color="#94a3b8" />
      </View>
      <Text className="max-w-[280px] text-center text-sm leading-6 text-slate-500">{message}</Text>
    </SectionCard>
  );
}

export function RecommendationCard({
  title,
  description,
  children,
  actionLabel,
  onAction,
  isLoading,
  error,
}: {
  title: string;
  description: string;
  children: ReactNode;
  actionLabel: string;
  onAction: () => void;
  isLoading: boolean;
  error?: string | null;
}) {
  return (
    <SectionCard className="border-emerald-100">
      <Text className="text-[10px] uppercase tracking-[1.6px] text-emerald-700">Recommendation</Text>
      <Text className="mt-2 text-2xl text-slate-900">{title}</Text>
      <Text className="mt-2 text-sm leading-6 text-slate-500">{description}</Text>

      <View className="mt-6 gap-4">{children}</View>

      {error ? (
        <View className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
          <Text className="text-sm leading-5 text-rose-700">{error}</Text>
        </View>
      ) : null}

      <Button onPress={onAction} className="mt-6 h-14 bg-primary" textClassName="text-white" loading={isLoading} disabled={isLoading}>
        {actionLabel}
      </Button>
    </SectionCard>
  );
}

export function TargetRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-2xl border border-primary/10 px-4 py-4">
      <View className="pr-4">
        <Text className="text-lg text-slate-900">{label}</Text>
        <Text className="text-xs text-slate-500">{detail}</Text>
      </View>
      <Text className="text-2xl text-primary">{value}</Text>
    </View>
  );
}

export function SuggestionAlert({
  title,
  message,
  currentValue,
  suggestedValue,
}: {
  title: string;
  message: string;
  currentValue: string;
  suggestedValue: string;
}) {
  return (
    <View className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
      <View className="mb-2 flex-row items-center gap-2">
        <Ionicons name="warning" size={18} color="#d97706" />
        <Text className="text-sm uppercase tracking-[1.4px] text-amber-800">{title}</Text>
      </View>
      <Text className="text-sm leading-6 text-amber-700">{message}</Text>
      <View className="mt-4 rounded-2xl bg-amber-100/60 p-4">
        <Text className="text-xs text-amber-800">Current Hifz target: {currentValue}</Text>
        <Text className="mt-1 text-xs text-amber-900">Suggested Hifz target: {suggestedValue}</Text>
      </View>
    </View>
  );
}
