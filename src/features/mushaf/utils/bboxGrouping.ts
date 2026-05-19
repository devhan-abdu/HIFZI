import type { AyahBbox } from "../../quran/type";
import type { Rect } from "../types/mushaf";
import { transformBbox } from "./coordinates";

export type ScaledAyahRegion = {
  sura: number;
  ayah: number;
  verseKey: string;
  rects: Rect[];
  /** Smallest rect area — used to resolve overlapping ayah hit targets */
  minArea: number;
};

export function groupBboxesByAyah(
  bboxes: AyahBbox[],
  scale: number,
  offsetX: number,
  offsetY: number,
): ScaledAyahRegion[] {
  const groups = new Map<string, ScaledAyahRegion>();

  for (const bbox of bboxes) {
    const verseKey = `${bbox.sura}:${bbox.ayah}`;
    const scaledRect = transformBbox(bbox, scale, offsetX, offsetY);
    const area = scaledRect.width * scaledRect.height;

    const existing = groups.get(verseKey);
    if (existing) {
      existing.rects.push(scaledRect);
      existing.minArea = Math.min(existing.minArea, area);
    } else {
      groups.set(verseKey, {
        sura: bbox.sura,
        ayah: bbox.ayah,
        verseKey,
        rects: [scaledRect],
        minArea: area,
      });
    }
  }

  return Array.from(groups.values());
}

/** Prefer the smallest matching region when rects overlap (nested ayah markers). */
export function findAyahAtPoint(
  regions: ScaledAyahRegion[],
  x: number,
  y: number,
): ScaledAyahRegion | null {
  let best: ScaledAyahRegion | null = null;

  for (const region of regions) {
    const hit = region.rects.some(
      (rect) =>
        x >= rect.x &&
        x <= rect.x + rect.width &&
        y >= rect.y &&
        y <= rect.y + rect.height,
    );
    if (!hit) continue;
    if (!best || region.minArea < best.minArea) {
      best = region;
    }
  }

  return best;
}

export function ayahExistsOnPage(
  bboxes: AyahBbox[],
  sura: number,
  ayah: number,
): boolean {
  return bboxes.some((b) => b.sura === sura && b.ayah === ayah);
}
