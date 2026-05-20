import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'expo-sqlite/localStorage/install';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const missingConfig = [
  !supabaseUrl ? "EXPO_PUBLIC_SUPABASE_URL" : null,
  !supabasePublishableKey ? "EXPO_PUBLIC_SUPABASE_ANON_KEY" : null,
].filter(Boolean) as string[];

export const supabaseConfigError =
  missingConfig.length > 0
    ? `Missing app config: ${missingConfig.join(", ")}. Rebuild the app with the correct Expo environment variables.`
    : null;

export const supabase = createClient(
  supabaseUrl ?? "https://invalid.local",
  supabasePublishableKey ?? "missing-anon-key",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

if (!supabaseConfigError && Platform.OS !== "web") {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
