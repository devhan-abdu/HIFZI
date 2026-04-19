import { ReactNode } from "react";
import { KeyboardAvoidingView, View, Platform } from "react-native";

interface ScreenProps {
  children: ReactNode;
  className?: string;
}

export default function Screen({ children, className = "" }: ScreenProps) {
  return (
    <View className={`flex-1 bg-white px-4 ${className}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}
