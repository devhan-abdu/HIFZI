import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import { Text } from "@/src/components/common/ui/Text";
import { useSyncStatus } from "@/src/hooks/useSyncStatus";

export function SyncStatusPill() {
  const { isSyncing, isOnline, lastSyncedAt, syncError } = useSyncStatus();

  if (syncError) {
    return (
      <View className="flex-row items-center bg-red-50 border border-red-100 rounded-full px-3 py-1 self-start">
        <Ionicons name="cloud-offline-outline" size={12} color="#dc2626" />
        <Text className="text-red-700 text-[10px] ml-1.5">Sync issue</Text>
      </View>
    );
  }

  if (!isOnline) {
    return (
      <View className="flex-row items-center bg-amber-50 border border-amber-100 rounded-full px-3 py-1 self-start">
        <Ionicons name="cloud-offline-outline" size={12} color="#d97706" />
        <Text className="text-amber-800 text-[10px] ml-1.5">Offline</Text>
      </View>
    );
  }

  if (isSyncing) {
    return (
      <View className="flex-row items-center bg-slate-100 rounded-full px-3 py-1 self-start">
        <Ionicons name="sync-outline" size={12} color="#64748b" />
        <Text className="text-slate-600 text-[10px] ml-1.5">Syncing…</Text>
      </View>
    );
  }

  const label = lastSyncedAt
    ? `Synced ${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}`
    : "Not synced yet";

  return (
    <View className="flex-row items-center bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 self-start">
      <Ionicons name="cloud-done-outline" size={12} color="#276359" />
      <Text className="text-emerald-800 text-[10px] ml-1.5">{label}</Text>
    </View>
  );
}
