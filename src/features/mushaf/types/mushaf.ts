import { AyahBbox } from "../../quran/type";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScaledAyahBbox extends AyahBbox {
  scaledRect: Rect;
}

export interface SelectionState {
  sura: number;
  ayah: number;
}

