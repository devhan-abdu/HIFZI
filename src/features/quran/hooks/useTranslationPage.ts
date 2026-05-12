import { useEffect, useRef, useState, useCallback } from "react";
import {
  loadTranslationPage,
  prefetchTranslationPages,
  VerseTranslationEntry,
} from "../services/translationPageService";

type State = {
  verses: VerseTranslationEntry[];
  loading: boolean;
  error: string | null;
};

const INITIAL: State = { verses: [], loading: true, error: null };

export function useTranslationPage(page: number, translationIds: number[]) {
  const [state, setState] = useState<State>(INITIAL);
  const mountedRef = useRef(true);
  const lastKeyRef = useRef("");

  const load = useCallback(async (p: number, tids: number[]) => {
    const key = `${p}:${tids.sort().join(",")}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const verses = await loadTranslationPage(p, tids);
      if (!mountedRef.current || lastKeyRef.current !== key) return;

      if (verses.length === 0) {
        setState({ 
          verses: [], 
          loading: false, 
          error: "Content not available for this page. Please check your connection or try another translation." 
        });
      } else {
        setState({ verses, loading: false, error: null });
        // Background prefetch adjacent pages
        prefetchTranslationPages(p, tids);
      }
    } catch (e: any) {
      if (!mountedRef.current || lastKeyRef.current !== key) return;
      setState({ verses: [], loading: false, error: e?.message ?? "Failed to load" });
    }
  }, []);

  const retry = useCallback(() => {
    lastKeyRef.current = "";
    void load(page, translationIds);
  }, [page, translationIds, load]);

  useEffect(() => {
    mountedRef.current = true;
    void load(page, translationIds);
    return () => { mountedRef.current = false; };
  }, [page, translationIds, load]);

  return { ...state, retry };
}