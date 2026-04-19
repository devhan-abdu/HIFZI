import React, { useEffect } from "react";
import { View, Modal } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  Text
} from "@/src/components/common/ui/Text";

interface AlertProps {
  visible: boolean;
  type: "success" | "delete" | "warning" | "info";
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const Alert = ({
  visible,
  type,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: AlertProps) => {
  const scale = useSharedValue(0.9);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    } else {
      scale.value = withTiming(0.9);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  const getTheme = () => {
    switch (type) {
      case "delete":
        return {
          icon: "trash",
          color: "text-red-500",
          bg: "bg-red-50",
          btn: "bg-red-500",
        };
      case "warning":
        return {
          icon: "alert-circle",
          color: "text-amber-500",
          bg: "bg-emerald-50",
          btn: "bg-primary",
        };
      case "success":
        return {
          icon: "checkmark-done-circle",
          color: "text-primary",
          bg: "bg-emerald-50",
          btn: "bg-primary",
        };
      default:
        return {
          icon: "information-circle",
          color: "text-slate-500",
          bg: "bg-slate-50",
          btn: "bg-slate-800",
        };
    }
  };

  const theme = getTheme();

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View
        className="flex-1 justify-center items-center bg-black/40 px-6"
        entering={FadeIn}
        exiting={FadeOut}
      >
        <Animated.View
          style={animatedStyle}
          className="w-full bg-white rounded-2xl p-8 items-center shadow-2xl"
        >
          <View className={`${theme.bg} p-3 rounded-full mb-6`}>
            <Ionicons
              name={theme.icon as any}
              size={24}
              color={type === "success" ? "#276359" : "#ef4444"}
            />
          </View>

          <Text className="text-2xl  text-slate-900 text-center mb-2 tracking-tight">
            {title}
          </Text>

          <Text className="text-slate-500 text-center text-md leading-6 mb-8 px-2">
            {message}
          </Text>

          <View className="flex-row w-full gap-3">
            <Button
              onPress={onCancel}
              className="flex-1 h-12 bg-slate-100 rounded-xl justify-center items-center active:bg-slate-200"
            >
              <Text className="text-slate-600   text-lg">{cancelText}</Text>
            </Button>

            <Button
              onPress={onConfirm}
              className={`flex-1 h-12 ${theme.btn} rounded-xl justify-center items-center shadow-lg shadow-emerald-900/20 active:opacity-90`}
            >
              <Text className="text-white  text-lg">{confirmText}</Text>
            </Button>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};
