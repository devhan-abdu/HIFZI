import { Pressable, Text, View } from "react-native";

export const StatusChip = ({
  status,
}: {
  status: "pending" | "completed" | "partial" | "missed";
}) => {
  console.log(status, "statussss");
  const config = {
    completed: {
      label: "Completed",
      bg: "bg-green-100",
      text: "text-green-700",
    },
    partial: {
      label: "Partial",
      bg: "bg-yellow-100",
      text: "text-yellow-700",
    },
    missed: {
      label: "Missed",
      bg: "bg-red-100",
      text: "text-red-700",
    },
    pending: {
      label: "Partial",
      bg: "bg-yellow-100",
      text: "text-yellow-700",
    },
  };

  const s = config[status];

  return (
    <View className={`${s.bg} px-4 py-2  self-start rounded-full`}>
      <Text className={` ${s.text}`}>{s.label}</Text>
    </View>
  );
};
