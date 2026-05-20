import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_PAGE_KEY = "quran_last_read_page";

export async function getLastReadPage(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_PAGE_KEY);
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1 || n > 604) return null;
    return n;
  } catch {
    return null;
  }
}

export async function setLastReadPage(page: number): Promise<void> {
  if (page < 1 || page > 604) return;
  try {
    await AsyncStorage.setItem(LAST_PAGE_KEY, String(page));
  } catch (e) {
    console.error("[quranLastReadStorage]", e);
  }
}
