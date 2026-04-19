import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable } from "react-native";
import { Text } from "@/src/components/common/ui/Text";

export const StatusButton = ({
  label,
  icon,
  activeColor,
  isActive,
  isDisabled,
  onPress,
  loading,
}: any) => {
  const isSkip = label.toLowerCase() === "skip";

  const containerStyle =
    isActive ?
      isSkip ? "bg-red-50 border-red-100 shadow-sm"
      : `${activeColor} border-transparent shadow-md shadow-slate-200`
    : "bg-white border-slate-100";

  const contentColor =
    isActive ?
      isSkip ? "#ef4444"
      : "#ffffff"
    : "#94a3b8";

  return (
    <Pressable
      onPress={onPress}
      disabled={loading || isDisabled}
      className={`flex-1 flex-row items-center justify-center py-3.5 rounded-xl border ${containerStyle} active:scale-[0.97]`}
    >
      {loading ?
        <ActivityIndicator size="small" color={contentColor} />
      : <>
          <Ionicons name={icon as any} size={16} color={contentColor} />
          <Text
            style={{ color: contentColor }}
            className="ml-2 text-[10px]  uppercase tracking-widest"
          >
            {label}
          </Text>
        </>
      }
    </Pressable>
  );
};
