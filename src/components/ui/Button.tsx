import { cn } from "@/src/lib/utils";
import { Pressable, PressableProps, View, ActivityIndicator } from "react-native";
import { Text } from "../common/ui/Text";

type ButtonVariant = "primary" | "outline" | "ghost" | "none";

interface ButtonProps extends PressableProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  className?: string;
  textClassName?: string;
  disabled?: boolean;
  loading?: boolean;
}

export function Button({
  children,
  onPress,
  variant = "primary",
  className = "",
  textClassName = "",
  disabled = false,
  loading = false,
  ...rest
}: ButtonProps) {

  const isEffectivelyDisabled = disabled || loading;

  const variants: Record<ButtonVariant, string> = {
    primary: "bg-primary",
    outline: "border border-border bg-transparent dark:border-white/15",
    ghost: "bg-transparent",
    none: "",
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isEffectivelyDisabled}
      className={cn(
        "rounded-2xl px-6 h-14 flex-row items-center justify-center overflow-hidden",
        variants[variant],
        isEffectivelyDisabled && "opacity-50",
        className,
      )}
      {...rest}
    >
      <View className="flex-row items-center justify-center gap-x-3">
        {loading && (
          <ActivityIndicator color={variant === "primary" ? "#fff" : "#276359"} size="small" />
        )}
        
        {typeof children === "string" ? (
          <Text
            className={cn(
              " uppercase tracking-[1.5px] text-[12px]",
              variant === "primary" ? "text-white" : "text-primary",
              textClassName
            )}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </Pressable>
  );
}
