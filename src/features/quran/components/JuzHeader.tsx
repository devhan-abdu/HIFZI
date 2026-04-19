import { View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";

export function JuzHeader({
  juzNumber,
  juzStartingPage,
}: {
  juzNumber: number;
  juzStartingPage: number;
}) {
  return (
    <View className="bg-gray-200  p-4 flex-row items-center justify-between px-4">
      <Text className="text-lg">Juz' {juzNumber}</Text>
      <Text className="text-lg">{juzStartingPage}</Text>
    </View>
  );
}
