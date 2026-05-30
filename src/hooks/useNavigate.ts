import { useRef, useCallback } from "react";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";

const DEBOUNCE_MS = 600;

/**
 * A drop-in replacement for `useRouter()` that automatically debounces
 * navigation calls. This prevents the common "double-tap" bug where pressing
 * a button multiple times quickly pushes duplicate screens onto the stack.
 *
 * Usage:
 *   const { push, replace, back } = useNavigate();
 *   <Pressable onPress={() => push("/quran/reader?page=1")} />
 */
export function useNavigate() {
  const router = useRouter();
  const isNavigating = useRef(false);

  const guard = useCallback(
    <T>(fn: (arg: T) => void) =>
      (arg: T) => {
        if (isNavigating.current) return;
        isNavigating.current = true;
        fn(arg);
        setTimeout(() => {
          isNavigating.current = false;
        }, DEBOUNCE_MS);
      },
    [],
  );

  const push = useCallback(
    guard<Href>((href) => router.push(href)),
    [guard, router],
  );

  const replace = useCallback(
    guard<Href>((href) => router.replace(href)),
    [guard, router],
  );

  const back = useCallback(() => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    router.back();
    setTimeout(() => {
      isNavigating.current = false;
    }, DEBOUNCE_MS);
  }, [router]);

  return { push, replace, back, router };
}
