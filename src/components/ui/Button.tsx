import { cn } from "@/src/lib/utils";
import { useState } from "react";
import { Pressable, PressableProps, Text, View } from "react-native";

type ButtonVariant = "primary" | "outline" | "ghost" | "none";

interface ButtonProps extends PressableProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  className?: string;
  disabled?: boolean;
}

export function Button({
  children,
  onPress,
  variant = "primary",
  className = "",
  disabled = false,
  ...rest
}: ButtonProps) {

  const variants: Record<ButtonVariant, string> = {
    primary: "bg-primary",
    outline: "border border-primary bg-transparent",
    ghost: "bg-transparent",
    none: "",
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        "rounded-2xl px-6 h-14 flex-row items-center justify-center overflow-hidden",
        variants[variant],
        disabled && "opacity-50",
        className,
      )}
      {...rest}
    >
      <View className="flex-row items-center justify-center gap-x-3">
        {typeof children === "string" ? (
          <Text
            className={cn(
              " uppercase tracking-[1.5px] text-[12px]",
              variant === "primary" ? "text-white" : "text-primary",
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
