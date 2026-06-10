import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function useAppActiveRefresh(onRefresh: () => void) {
  const lastActiveDate = useRef<string>(new Date().toDateString());
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        const todayDate = new Date().toDateString();
        
        if (todayDate !== lastActiveDate.current) {
          lastActiveDate.current = todayDate;
          onRefresh();
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [onRefresh]);
}
