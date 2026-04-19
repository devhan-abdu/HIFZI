import { cn } from "@/src/lib/utils";
import { Text as RNText, Pressable } from "react-native";

import type { TextProps as RNTextProps, PressableProps } from "react-native";

interface TextProps extends RNTextProps {
  className?: string;
}

export function Text({ className, ...props }: TextProps) {
  return (
    <RNText
      {...props}
      className={cn("text-foreground", className)}
      style={{
        fontFamily: "Rosemary",
      }}
    />
  );
}


interface ButtonProps extends PressableProps {
  className?: string;
}

export function Button({ className, ...props }: ButtonProps) {
  return <Pressable {...props} className={cn("font-rosemary", className)} />;
}
