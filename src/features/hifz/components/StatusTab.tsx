import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { useColorScheme } from "nativewind";

type StatusVariant = "completed" | "partial" | "missed";

type StatusTabProps = {
  label: string;
  icon: string;
  active: boolean;
  variant: StatusVariant;
  onPress: () => void;
};

const statusStyles = {
  completed: {
    active: "border-primary",
    inactive: "bg-emerald-800/15",
    icon: "#276359",
  },
  partial: {
    active: "border-amber-500",
    inactive: "border-amber-500/15",
    icon: "#f59e0b",
  },
  missed: {
    active: "border-red-500",
    inactive: "border-red-500/15",
    icon: "#ef4444",
  },
} as const;

export function StatusTab({
  label,
  icon,
  active,
  variant,
  onPress,
}: StatusTabProps) {
  const styles = statusStyles[variant];

  return (
    <Pressable
      onPress={onPress}
      className={`
        w-[31%]
        items-center
        justify-center
        rounded-2xl
        border-2
        px-3
        py-4
        transition-all
        ${
          active ?
            styles.active
          : `bg-surface dark:bg-surface-muted ${styles.inactive}`
        }
      `}
    >
      <Ionicons name={icon as any} size={24} color={styles.icon} />

      <Text
        className={`mt-2 font-semibold  text-text
          
    `}
      >
        {label}
      </Text>
    </Pressable>
  );
}
