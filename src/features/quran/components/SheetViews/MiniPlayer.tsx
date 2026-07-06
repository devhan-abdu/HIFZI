import { Text } from "@/src/components/common/ui/Text";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import { useReaderStore } from "../../hooks/useReaderStore";

export const MiniPlayer = ({ progress }: { progress: number }) => {
  const { playingAyah, uiMode } = useReaderStore();


  return (
    <View className="p-4 bg-primary rounded-t-3xl">
      {progress > 0 && progress < 1 ?
        <View className="flex-row items-center justify-between">
          <Text className="text-primary-foreground text-xs">Downloading Chapter...</Text>
          <View className="flex-1 mx-4 h-1 bg-white/20 rounded-full overflow-hidden">
            <View
              style={{ width: `${progress * 100}%` }}
              className="h-full bg-primary-foreground"
            />
          </View>
          <Text className="text-primary-foreground text-xs">
            {Math.round(progress * 100)}%
          </Text>
        </View>
      : <View className="flex-row items-center justify-between">
          <Ionicons name="play-back" size={24} color="white" />
          <TouchableOpacity className="bg-surface p-3 rounded-full">
            <Ionicons name="pause" size={24} color="#276359" />
          </TouchableOpacity>
          <Ionicons name="play-forward" size={24} color="white" />
        </View>
      }
      <Text className="text-center text-primary-foreground/60 text-[10px] mt-2">
        Now Playing: Ayah {playingAyah}
      </Text>
    </View>
  );
};
