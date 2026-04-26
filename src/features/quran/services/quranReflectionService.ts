import { callQF } from "./qfClient";

export async function getReflectionContextByPage(page: number) {
  try {
    const response = await callQF(`/content/verses/by_page/${page}`, {
      params: { words: false, per_page: 3 },
      silentErrorLog: true,
    });

    const verses = response?.verses ?? response?.data?.verses ?? [];
    if (Array.isArray(verses) && verses.length > 0) {
      const first = verses[0];
      const chapterName = first?.verse_key ? `Surah ${String(first.verse_key).split(":")[0]}` : "Current page";
      const excerpt = verses
        .slice(0, 2)
        .map((verse: any) => verse?.text_uthmani ?? verse?.text_imlaei ?? "")
        .filter(Boolean)
        .join(" ");

      return {
        title: chapterName,
        excerpt: excerpt || "Reflect on the ayahs you just recited.",
      };
    }
  } catch {}

  return {
    title: "Reflection",
    excerpt: "What touched your heart in this reading session?",
  };
}
