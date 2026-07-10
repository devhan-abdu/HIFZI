import React from "react";
import { View } from "react-native";


export const SectionSkeleton = () => {
  return (
    <View className="bg-surface dark:bg-surface-muted rounded-2xl p-6 mb-6 shadow-xl border border-border dark:border-white/10 animat-pulse">
      <View className="w-24 h-4 bg-border rounded-md mb-3" />
      <View className="w-32 h-8 bg-border rounded-lg mb-5" />

      <View className="w-20 h-4 bg-border rounded-md mb-2" />
      <View className="w-28 h-6 bg-border rounded-md mb-4" />

      <View className="w-20 h-4 bg-border rounded-md mb-2" />
      <View className="w-32 h-6 bg-border rounded-md mb-4" />

      <View className="flex-row justify-between mt-2">
        <View className="w-20 h-4 bg-border rounded-md" />
        <View className="w-20 h-4 bg-border rounded-md" />
        <View className="w-20 h-4 bg-border rounded-md" />
      </View>
    </View>
  );
};

const SkeletonItem = ({ className }: { className?: string }) => (
  <View className={`bg-border ${className}`} />
);

export const DashboardSkeleton = () => {
  return (
    <View className="flex-1 bg-background p-4 mt-24">
    <CardSkeleton/>

      <View className="mt-10 px-1">
        <SkeletonItem className="w-20 h-2 mb-3 opacity-50" />
        <SkeletonItem className="w-40 h-6 mb-6" />

        <View className="flex-row flex-wrap justify-between">
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              className="w-[48%] h-24 bg-border rounded-[24px] border border-border p-4 mb-4"
            >
              <SkeletonItem className="w-8 h-8 rounded-xl mb-2" />
              <SkeletonItem className="w-12 h-2 mb-2 opacity-50" />
              <SkeletonItem className="w-20 h-4" />
            </View>
          ))}
        </View>
      </View>

      <View className="mt-6 px-1">
        <SkeletonItem className="w-16 h-2 mb-3 opacity-50" />
        <SkeletonItem className="w-32 h-6 mb-5" />

        {[1, 2].map((i) => (
          <View
            key={i}
            className="w-full h-20 bg-background rounded-[24px] mb-3 border border-border p-4 flex-row items-center"
          >
            <SkeletonItem className="w-10 h-10 rounded-full mr-4" />
            <View>
              <SkeletonItem className="w-32 h-4 mb-2" />
              <SkeletonItem className="w-20 h-2 opacity-50" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};



const SkeletonPulse = ({ className }: { className?: string }) => (
  <View className={`bg-border ${className}`} />
);

export const CardSkeleton = () => {
  return (
    <View className="bg-surface dark:bg-surface-muted rounded-[40px] p-7 overflow-hidden relative border border-border dark:border-white/10">
      <View className="flex-row justify-between items-end mb-6">
        <View>
          <SkeletonPulse className="w-24 h-2 mb-2" />
          <SkeletonPulse className="w-48 h-8" />
        </View>
        <View className="items-end">
          <SkeletonPulse className="w-16 h-2 mb-2" />
          <SkeletonPulse className="w-12 h-6 rounded-xl" />
        </View>
      </View>

      <View className="w-full h-[7px] bg-border rounded-full mb-9" />

      <View className="flex-row">
        <View className="flex-1 pr-5 border-r border-border">
          <View className="flex-row items-center mb-4">
            <View className="w-3 h-3 rounded-full bg-border" />
            <SkeletonPulse className="w-16 h-2 ml-2" />
          </View>
          <SkeletonPulse className="w-full h-7 mb-2" />
          <SkeletonPulse className="w-20 h-3" />

          <View className="mt-7 flex-row justify-between">
            <View>
              <SkeletonPulse className="w-10 h-4" />
            </View>
            <View>
              <SkeletonPulse className="w-10 h-4" />
            </View>
          </View>
        </View>

        <View className="flex-1 pl-5">
          <View className="flex-row items-center mb-4">
            <View className="w-3 h-3 rounded-full bg-border" />
            <SkeletonPulse className="w-20 h-2 ml-2" />
          </View>
          <SkeletonPulse className="w-full h-7 mb-2" />
          <SkeletonPulse className="w-24 h-3" />

          <View className="mt-7 flex-row justify-between">
            <View>
              <SkeletonPulse className="w-10 h-4" />
            </View>
            <View>
              <SkeletonPulse className="w-10 h-4" />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};
