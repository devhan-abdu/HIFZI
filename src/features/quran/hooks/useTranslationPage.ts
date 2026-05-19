import { useEffect, useRef, useState, useCallback } from "react";
import {
  loadTranslationPage,
  prefetchTranslationPages,
  peekTranslationPage,
  VerseTranslationEntry,
} from "../services/translationPageService";

type State = {
  verses: VerseTranslationEntry[];
  loading: boolean;
  error: string | null;
};

function buildInitialState(
  page: number,
  translationIds: number[],
): State {
  const cached = peekTranslationPage(page, translationIds);
  if (cached && cached.length > 0) {
    return { verses: cached, loading: false, error: null };
  }
  return { verses: [], loading: true, error: null };
}

export function useTranslationPage(page: number, translationIds: number[]) {
  const [state, setState] = useState<State>(() =>
    buildInitialState(page, translationIds),
  );
  const mountedRef = useRef(true);
  const lastKeyRef = useRef("");

  const load = useCallback(async (p: number, tids: number[]) => {
    const key = `${p}:${[...tids].sort((a, b) => a - b).join(",")}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    const cached = peekTranslationPage(p, tids);
    if (cached && cached.length > 0) {
      setState({ verses: cached, loading: false, error: null });
      prefetchTranslationPages(p, tids);
      return;
    }

    setState((prev) =>
      prev.verses.length > 0
        ? { ...prev, loading: false, error: null }
        : { ...prev, loading: true, error: null },
    );

    try {
      const verses = await loadTranslationPage(p, tids);
      if (!mountedRef.current || lastKeyRef.current !== key) return;

      if (verses.length === 0) {
        setState({
          verses: [],
          loading: false,
          error:
            "Content not available for this page. Please check your connection or try another translation.",
        });
      } else {
        setState({ verses, loading: false, error: null });
        prefetchTranslationPages(p, tids);
      }
    } catch (e: unknown) {
      if (!mountedRef.current || lastKeyRef.current !== key) return;
      const message = e instanceof Error ? e.message : "Failed to load";
      setState({ verses: [], loading: false, error: message });
    }
  }, []);

  const retry = useCallback(() => {
    lastKeyRef.current = "";
    void load(page, translationIds);
  }, [page, translationIds, load]);

  useEffect(() => {
    mountedRef.current = true;
    const cached = peekTranslationPage(page, translationIds);
    if (cached && cached.length > 0) {
      setState({ verses: cached, loading: false, error: null });
      prefetchTranslationPages(page, translationIds);
    } else {
      void load(page, translationIds);
    }
    return () => {
      mountedRef.current = false;
    };
  }, [page, translationIds, load]);

  return { ...state, retry };
}
