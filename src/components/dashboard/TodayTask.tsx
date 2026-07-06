import { View, Pressable } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { Ionicons } from "@expo/vector-icons";
import { useNavigate } from "@/src/hooks/useNavigate";
import { HifzCard } from "@/src/features/hifz/components/HifzCard";
import { MurajaCard } from "@/src/features/muraja/components/MurajaCard";

export const TodayTasksSection = ({
  onLogHifz,
  onLogMuraja,
}: {
  onLogHifz: () => void;
  onLogMuraja: () => void;
}) => {
   return (
     <View className="gap-y-4">
       <HifzCard onLog={onLogHifz} />
       <MurajaCard onLog={onLogMuraja} />
     </View>
   );
};

export const EvaluationRequiredCard = ({ type,planId }: { type: 'hifz' | 'muraja' , planId?:number}) => {
  const { push } = useNavigate();
  return (
    <Pressable
      onPress={() =>
        push(`/evaluation?type=${type.toUpperCase()}&planId=${planId}`)
      }
      className="bg-surface border border-border rounded-2xl p-6 shadow-sm overflow-hidden"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-4">
          <View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center">
            <Ionicons name="lock-closed-outline" size={24} color="#276359" />
          </View>
          <View>
            <Text className="text-text">
              {type === "hifz" ?
                "Hifz Review Required"
              : "Muraja Review Required"}
            </Text>
            <Text className="text-muted text-xs">
              Finish evaluation to unlock new tasks
            </Text>
          </View>
        </View>
        <View className="bg-primary px-3 py-1 rounded-full">
          <Text className="text-[10px] text-primary-foreground uppercase">Test</Text>
        </View>
      </View>
    </Pressable>
  );
};


export const RestDayCardSingle = ({ type, onLog }: { type: 'hifz' | 'muraja', onLog: () => void }) => (
    <Pressable 
        onPress={onLog}
        className="bg-surface border border-border shadow-sm rounded-2xl p-6 flex-row items-center justify-between"
    >
        <View className="flex-row items-center gap-4">
            <View className={`w-12 h-12 rounded-full items-center justify-center bg-primary/10`}>
                <Ionicons name="cafe-outline" size={24} color={type === 'hifz' ? '#276359' : '#0891b2'} />
            </View>
            <View>
                <Text className="text-text">{type === 'hifz' ? 'Hifz Rest Day' : 'Muraja Rest Day'}</Text>
                <Text className="text-muted text-xs">No tasks for today</Text>
            </View>
        </View>
        <Ionicons name="add-circle" size={24} color="#CBD5E1" />
    </Pressable>
)




