import { cn } from "@/src/lib/utils";
import { useState } from "react";
import { Pressable, PressableProps, Text } from "react-native";

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
  const [pressed, setPressed] = useState(false);

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
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      className={cn(
        "rounded-lg px-4 py-3 h-14 items-center justify-center",
        variants[variant],
        pressed && "opacity-80",
        disabled && "opacity-50",
        className,
      )}
      {...rest}
    >
      <Text
        className={cn(
          "",
          variant === "primary" ? "text-white" : "text-primary",
        )}
      >
        {children}
      </Text>
    </Pressable>
  );
}
