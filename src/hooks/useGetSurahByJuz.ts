import { useCatalogStore } from "../features/quran/store/catalogStore";

export const useGetSurahByJuz = () => {
  const juzs = useCatalogStore((store) => store.juzSections);
  const displayData = useCatalogStore((store) => store.displaySections);
  const loading = useCatalogStore((store) => store.status === "idle" || store.status === "loading");
  const error = useCatalogStore((store) => store.error ?? "");

  return { displayData, juzs, loading, error };
};
