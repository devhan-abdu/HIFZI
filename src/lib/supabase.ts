import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import 'expo-sqlite/localStorage/install';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey =process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

if(Platform.OS !== "web") {
  AppState.addEventListener('change', (state) => {
           if(state === 'active') {
            supabase.auth.startAutoRefresh()
           } else {
             supabase.auth.stopAutoRefresh()
           }
  })
}
