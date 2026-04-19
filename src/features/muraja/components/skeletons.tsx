import { View } from "react-native";
import Screen from "@/src/components/screen/Screen";
import { ScreenContent } from "@/src/components/screen/ScreenContent";

export const WeeklyMurajaSkeleton = () => {
  return (
    <Screen>
      <ScreenContent>
        <View className="flex-1 animate-pulse">
          <View className="bg-white rounded-2xl p-6 mb-6 shadow-xl border border-gray-200">
            <View className="w-24 h-4 bg-gray-300 rounded-md mb-3" />
            <View className="w-32 h-8 bg-gray-300 rounded-lg mb-5" />

            <View className="w-20 h-4 bg-gray-300 rounded-md mb-2" />
            <View className="w-28 h-6 bg-gray-300 rounded-md mb-4" />

            <View className="w-20 h-4 bg-gray-300 rounded-md mb-2" />
            <View className="w-32 h-6 bg-gray-300 rounded-md mb-4" />

            <View className="flex-row justify-between mt-2">
              <View className="w-20 h-4 bg-gray-300 rounded-md" />
              <View className="w-20 h-4 bg-gray-300 rounded-md" />
              <View className="w-20 h-4 bg-gray-300 rounded-md" />
            </View>
          </View>

          <View className="mb-8">
            <View className="w-36 h-6 bg-gray-300 rounded-lg mb-4" />

            <View className="bg-white rounded-xl p-4 border border-gray-300 shadow-sm">
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <View className="w-24 h-6 bg-gray-300 rounded-md mb-2" />
                  <View className="w-16 h-4 bg-gray-300 rounded-md" />
                </View>
                <View className="w-10 h-10 bg-gray-300 rounded-full" />
              </View>

              <View className="border-t border-gray-200 pt-4">
                <View className="flex-row justify-between">
                  <View className="w-[30%] h-10 bg-gray-300 rounded-lg" />
                  <View className="w-[30%] h-10 bg-gray-300 rounded-lg" />
                  <View className="w-[30%] h-10 bg-gray-300 rounded-lg" />
                </View>
              </View>
            </View>
          </View>

          <View className="mb-8">
            <View className="w-48 h-6 bg-gray-300 rounded-lg mb-4" />

            <View className="flex-col gap-3">
              <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm h-20" />
              <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm h-20" />
            </View>
          </View>

          <View className="w-full h-12 bg-gray-300 rounded-xl mt-auto mb-6" />
        </View>
      </ScreenContent>
    </Screen>
  );
};

export const TodaySkeleton = () => {
  return (
    <Screen>
      <View className="mb-8">
        <View className="w-36 h-6 bg-gray-100 rounded-lg mb-4" />

        <View className="bg-white rounded-xl p-4 border border-gray-300 shadow-sm">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <View className="w-24 h-6 bg-gray-300 rounded-md mb-2" />
              <View className="w-16 h-4 bg-gray-300 rounded-md" />
            </View>
            <View className="w-10 h-10 bg-gray-300 rounded-full" />
          </View>

          <View className="border-t border-gray-200 pt-4">
            <View className="flex-row justify-between">
              <View className="w-[30%] h-10 bg-gray-300 rounded-lg" />
              <View className="w-[30%] h-10 bg-gray-300 rounded-lg" />
              <View className="w-[30%] h-10 bg-gray-300 rounded-lg" />
            </View>
          </View>
        </View>
      </View>
    </Screen>
  );
};

export const UpcomingSkeleton = () => {
  return (
    
    <View className="mb-8">
      <View className="w-48 h-6 bg-gray-300 rounded-lg mb-4" />

      <View className="flex-col gap-3">
        <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm h-20" />
        <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm h-20" />
      </View>
    </View>
  );
};

export const LogPageSkeleton = () => {
  const Pulse = ({ className }: { className: string }) => (
    <View className={`bg-gray-200 ${className}`} style={{ opacity: 0.6 }} />
  );

  return (
    <Screen>
      <View className="px-6 pt-4">
        <View className="bg-gray-100 p-6 rounded-[32px] mb-8 h-44 justify-between">
          <View>
            <Pulse className="w-20 h-3 rounded-full mb-3" />
            <Pulse className="w-48 h-8 rounded-xl" />
          </View>
          <View className="flex-row items-center justify-between border-t border-gray-200 pt-5">
            <Pulse className="w-20 h-4 rounded-md" />
            <Pulse className="w-16 h-4 rounded-md" />
            <Pulse className="w-16 h-4 rounded-md" />
          </View>
        </View>

        <Pulse className="w-32 h-6 rounded-md mb-4" />
        <View className="flex-row justify-between mb-8 gap-3">
          <Pulse className="flex-1 h-14 rounded-2xl" />
          <Pulse className="flex-1 h-14 rounded-2xl" />
          <Pulse className="flex-1 h-14 rounded-2xl" />
        </View>

        <View className="gap-6">
          <View className="bg-gray-50 p-6 rounded-[28px] border border-gray-100 flex-row items-center justify-between">
            <View className="gap-2">
              <Pulse className="w-32 h-5 rounded-md" />
              <Pulse className="w-24 h-3 rounded-md" />
            </View>
            <Pulse className="w-32 h-12 rounded-2xl" />
          </View>

          <View className="gap-4">
            <View>
              <Pulse className="w-24 h-3 rounded-full mb-2 ml-1" />
              <Pulse className="w-full h-14 rounded-[20px]" />
            </View>
            <View>
              <Pulse className="w-16 h-3 rounded-full mb-2 ml-1" />
              <Pulse className="w-full h-14 rounded-[20px]" />
            </View>
            <View>
              <Pulse className="w-32 h-3 rounded-full mb-2 ml-1" />
              <Pulse className="w-full h-32 rounded-[28px]" />
            </View>
          </View>
        </View>
      </View>

      <View className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-50">
        <Pulse className="w-full h-14 rounded-2xl" />
      </View>
    </Screen>
  );
};

export const ReviewSkeleton = () => (
 <Screen>
      <ScreenContent>
           <View className="h-48 w-full bg-gray-200 rounded-[32px] mb-8 animate-pulse overflow-hidden p-6 justify-between">
          <View className="flex-row justify-between">
            <View className="gap-2">
               <View className="h-3 w-20 bg-gray-300 rounded-full" />
               <View className="h-10 w-24 bg-gray-300 rounded-xl" />
            </View>
            <View className="h-14 w-14 bg-gray-300 rounded-2xl" />
          </View>
          <View className="flex-row gap-4 border-t border-gray-300 pt-5">
             <View className="flex-1 h-8 bg-gray-300 rounded-lg" />
             <View className="flex-1 h-8 bg-gray-300 rounded-lg" />
             <View className="flex-1 h-8 bg-gray-300 rounded-lg" />
          </View>
        </View>

        <View className="mb-8">
          <View className="h-5 w-40 bg-gray-200 rounded-full mb-4 animate-pulse" />
          <View className="h-20 w-full bg-gray-100 rounded-[32px] animate-pulse flex-row justify-around items-center px-4">
             {[1, 2, 3, 4, 5, 6, 7].map((i) => (
               <View key={i} className="items-center gap-2">
                 <View className="h-10 w-10 bg-gray-200 rounded-full" />
                 <View className="h-2 w-6 bg-gray-200 rounded-full" />
               </View>
             ))}
          </View>
        </View>

        <View className="flex-row flex-wrap justify-between gap-3 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              className="h-20 w-[48%] bg-gray-100 rounded-3xl animate-pulse"
            />
          ))}
        </View>

        <View className="h-28 w-full bg-gray-50 rounded-[24px] border border-gray-100 animate-pulse" />
      </ScreenContent>
    </Screen>
  );


