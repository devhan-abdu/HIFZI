import { Directory, Paths } from "expo-file-system";

export const quranRootDirectory = new Directory(Paths.document, "quran");
export const quranPagesDirectory = new Directory(quranRootDirectory, "pages");
export const quranAudioDirectory = new Directory(quranRootDirectory, "audio");
export const quranTranslationsDirectory = new Directory(
  quranRootDirectory,
  "translations",
);
export const quranTafsirsDirectory = new Directory(quranRootDirectory, "tafsirs");

const requiredDirectories = [
  quranRootDirectory,
  quranPagesDirectory,
  quranAudioDirectory,
  quranTranslationsDirectory,
  quranTafsirsDirectory,
];

export function ensureQuranStorageDirectories() {
  for (const directory of requiredDirectories) {
    if (!directory.exists) {
      directory.create({ idempotent: true, intermediates: true });
    }
  }
}
