type StatusType = "completed" | "partial" | "missed" | "pending";
import { useMemo } from "react";
import { Text, View } from "react-native";
import { Calendar } from "react-native-calendars";

type HistoryItem = {
  date: string;
  status: StatusType;
};

type HistoryCalendarProps = {
  userHistory: HistoryItem[];
  setViewDate: React.Dispatch<React.SetStateAction<Date>>;
};

const STATUS_COLORS: Record<StatusType, { bg: string; text: string }> = {
  completed: {
    bg: "#c8f8d9ff",
    text: "#064e3b",
  },
  partial: {
    bg: "#faf3a8ff",
    text: "#854d0e",
  },
  missed: {
    bg: "#fdceceff",
    text: "#7f1d1d",
  },
  pending: {
    bg: "#e0e0e0ff",
    text: "#606060",
  },
};

export const HistoryCalendar = ({
  userHistory,
  setViewDate,
}: HistoryCalendarProps) => {

  const markedDates = useMemo(() => {
    const dates: Record<string, any> = {};
    const today = new Date().toISOString().split("T")[0];

    dates[today] = {
      customStyles: {
        container: { backgroundColor: "#00ADF6", borderRadius: 8 },
        text: { color: "#fff", fontWeight: "bold" },
      },
    };

    userHistory?.forEach((item) => {
      dates[item.date] = {
        customStyles: {
          container: {
            backgroundColor: STATUS_COLORS[item.status].bg,
            borderRadius: 8,
          },
          text: {
            color: STATUS_COLORS[item.status].text,
            fontWeight: "600",
          },
        },
      };
    });
    return dates;
  }, [userHistory]);

  return (
    <View className="border border-slate-300 rounded-xl shadow-xl bg-white shadow-white mb-8">
      <View className="p-2">
        <Calendar
          onMonthChange={(month) =>
            setViewDate(new Date(month.year, month.month - 1, 1))
          }
          markingType="custom"
          markedDates={markedDates}
          theme={{
            todayTextColor: "#00ADF6",
            arrowColor: "#276359",
            indicatorColor: "#276359",
          }}
        />
      </View>
      <View className="flex-row items-center justify-center gap-6 border-t border-slate-200 py-5">
        <View className="flex-row items-center gap-2">
          <Text className="bg-green-200 rounded-full w-3 h-3" />

          <Text className="text-sm text-black/80">Completed</Text>
        </View>

        <View className="flex-row items-center gap-2">
          <Text className="bg-yellow-400 rounded-full w-3 h-3" />

          <Text className="text-sm text-black/80">Partial</Text>
        </View>

        <View className="flex-row items-center gap-2">
          <Text className="bg-red-400 rounded-full w-3 h-3" />

          <Text className="text-sm text-black/80">Missed</Text>
        </View>
      </View>
    </View>
  );
};
