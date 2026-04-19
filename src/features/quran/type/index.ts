export interface Surah {
  number: number;
  name: string;
  englishName: string;
  numberOfAyahs: number;
  revelationType: "Meccan" | "Medinan";
  startingPage: number;
  endingPage: number;
}

export interface JuzSection {
  juzNumber: number;
  surahs: Surah[];
}


export type AyahBbox = {
  sura: number,
  ayah: number,
  min_x: number,
  max_x: number,
  min_y: number,
  max_y: number,
  page: number
}

export type PageData = {
    number: number,
    name: string,
    hizb: number,
    juz: number,
    quartor: number,
    page: number
}
