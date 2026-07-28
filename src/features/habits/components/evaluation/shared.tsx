import { Text } from "@/src/components/common/ui/Text";
import { Button } from "@/src/components/ui/Button";
import { cn } from "@/src/lib/utils";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
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
      <Text className="text-[10px] uppercase tracking-[1.8px] text-muted">
        {eyebrow}
      </Text>
      <Text className="mt-2 text-3xl text-text">{title}</Text>
      <Text className="mt-2 text-sm leading-6 text-muted">{description}</Text>
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
  return (
    <View
      className={cn(
        "rounded-[32px] border border-border bg-surface p-6 dark:border-white/10",
        className,
      )}
    >
      {children}
    </View>
  );
}

export function MetricTile({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "primary" | "muted";
}) {
  const accents = {
    default: "text-text",
    primary: "text-primary",
    muted: "text-muted",
  } as const;

  return (
    <View className="min-w-[46%] flex-1 rounded-3xl border border-border bg-background px-4 py-5 dark:border-white/10">
      <Text className="text-[10px] uppercase tracking-[1.5px] text-muted">{label}</Text>
      <Text className={cn("mt-2 text-2xl", accents[accent])}>{value}</Text>
    </View>
  );
}

export function ExamGateCard({
  title,
  description,
  buttonLabel,
  onPress,
  disabled = false,
  footerNote,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  onPress: () => void;
  disabled?: boolean;
  footerNote?: string;
}) {
  return (
    <SectionCard>
      <View className="mb-5 flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-[10px] uppercase tracking-[1.6px] text-muted">
            Assessment Gate
          </Text>
          <Text className="mt-2 text-xl text-text">{title}</Text>
        </View>
        <View className="rounded-full border border-border bg-background px-3 py-1.5 dark:border-white/10">
          <Text className="text-[10px] uppercase tracking-[1.4px] text-muted">Exam</Text>
        </View>
      </View>

      <Text className="mb-5 text-sm leading-6 text-muted">{description}</Text>

      <Button
        onPress={onPress}
        className="h-14 bg-primary"
        textClassName="text-white"
        disabled={disabled}
      >
        {buttonLabel}
      </Button>

      {footerNote ? (
        <Text className="mt-4 text-xs leading-5 text-muted">{footerNote}</Text>
      ) : null}
    </SectionCard>
  );
}

export function LockedRecommendationCard({ message }: { message: string }) {
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#9ba3a0" : "#6b7280";

  return (
    <SectionCard className="items-center border-dashed py-8">
      <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-background border border-border dark:border-white/10">
        <Ionicons name="lock-closed" size={22} color={iconColor} />
      </View>
      <Text className="max-w-[280px] text-center text-sm leading-6 text-muted">{message}</Text>
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
    <SectionCard>
      <Text className="text-[10px] uppercase tracking-[1.6px] text-muted">Recommendation</Text>
      <Text className="mt-2 text-2xl text-text">{title}</Text>
      <Text className="mt-2 text-sm leading-6 text-muted">{description}</Text>

      <View className="mt-6 gap-4">{children}</View>

      {error ? (
        <View className="mt-5 rounded-2xl border border-border bg-background px-4 py-3 dark:border-white/10">
          <Text className="text-sm leading-5 text-muted">{error}</Text>
        </View>
      ) : null}

      <Button
        onPress={onAction}
        className="mt-6 h-14 bg-primary"
        textClassName="text-white"
        loading={isLoading}
        disabled={isLoading}
      >
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
    <View className="flex-row items-center justify-between rounded-2xl border border-border bg-background px-4 py-4 dark:border-white/10">
      <View className="pr-4">
        <Text className="text-lg text-text">{label}</Text>
        <Text className="text-xs text-muted">{detail}</Text>
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
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#4ade80" : "#276359";

  return (
    <View className="rounded-3xl border border-border bg-background p-5 dark:border-white/10">
      <View className="mb-2 flex-row items-center gap-2">
        <Ionicons name="information-circle-outline" size={18} color={iconColor} />
        <Text className="text-sm uppercase tracking-[1.4px] text-muted">{title}</Text>
      </View>
      <Text className="text-sm leading-6 text-muted">{message}</Text>
      <View className="mt-4 rounded-2xl border border-border bg-surface p-4 dark:border-white/10">
        <Text className="text-xs text-muted">Current Hifz target: {currentValue}</Text>
        <Text className="mt-1 text-xs text-text">Suggested Hifz target: {suggestedValue}</Text>
      </View>
    </View>
  );
}
