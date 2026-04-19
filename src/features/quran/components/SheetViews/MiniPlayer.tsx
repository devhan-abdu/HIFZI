import { Text } from "@/src/components/common/ui/Text";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import { useReaderStore } from "../../hook/useReaderStore";

export const MiniPlayer = ({ progress }: { progress: number }) => {
  const { playingAyah, uiMode } = useReaderStore();


  return (
    <View className="p-4 bg-slate-900 rounded-t-3xl">
      {progress > 0 && progress < 1 ?
        <View className="flex-row items-center justify-between">
          <Text className="text-white text-xs">Downloading Chapter...</Text>
          <View className="flex-1 mx-4 h-1 bg-gray-700 rounded-full overflow-hidden">
            <View
              style={{ width: `${progress * 100}%` }}
              className="h-full bg-teal-500"
            />
          </View>
          <Text className="text-white text-xs">
            {Math.round(progress * 100)}%
          </Text>
        </View>
      : <View className="flex-row items-center justify-between">
          {/* Control Buttons (Prev, Play/Pause, Next) similar to your image */}
          <Ionicons name="play-back" size={24} color="white" />
          <TouchableOpacity className="bg-white p-3 rounded-full">
            <Ionicons name="pause" size={24} color="black" />
          </TouchableOpacity>
          <Ionicons name="play-forward" size={24} color="white" />
        </View>
      }
      <Text className="text-center text-gray-400 text-[10px] mt-2">
        Now Playing: Ayah {playingAyah}
      </Text>
    </View>
  );
};
