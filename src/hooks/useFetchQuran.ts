import { useCatalogStore } from "../features/quran/store/catalogStore";

export const useLoadSurahData = () => {
  const items = useCatalogStore((store) => store.surahs);
  const loading = useCatalogStore((store) => store.status === "idle" || store.status === "loading");
  const error = useCatalogStore((store) => store.error ?? "");

  return { items, loading, error };
};
