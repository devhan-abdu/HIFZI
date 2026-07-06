import { View } from "react-native";

export function EvaluationSkeleton() {
  return (
    <View className="pb-20">
      <View className="mb-8">
        <View className="h-3 w-28 rounded-full bg-border" />
        <View className="mt-4 h-10 w-56 rounded-full bg-border" />
        <View className="mt-3 h-4 w-full rounded-full bg-border" />
        <View className="mt-2 h-4 w-4/5 rounded-full bg-border" />
      </View>

      <View className="gap-6">
        <View className="rounded-[32px] border border-border bg-surface p-6">
          <View className="flex-row flex-wrap gap-4">
            <View className="h-24 min-w-[46%] flex-1 rounded-3xl bg-border" />
            <View className="h-24 min-w-[46%] flex-1 rounded-3xl bg-border" />
            <View className="h-24 min-w-[46%] flex-1 rounded-3xl bg-border" />
          </View>
        </View>

        <View className="h-48 rounded-[32px] border border-border bg-border p-6" />
        <View className="h-56 rounded-[32px] border border-border bg-border p-6" />
      </View>
    </View>
  );
}
