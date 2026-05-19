import type { AyahBbox } from "../type";

const MAX_BBOX_PAGES = 24;
const bboxCache = new Map<number, AyahBbox[]>();
const imageUriCache = new Map<number, string>();

export function getCachedPageImageUri(page: number): string | undefined {
  return imageUriCache.get(page);
}

export function setCachedPageImageUri(page: number, uri: string): void {
  imageUriCache.set(page, uri);
}

export function getCachedBboxes(page: number): AyahBbox[] | undefined {
  return bboxCache.get(page);
}

export function setCachedBboxes(page: number, bboxes: AyahBbox[]): void {
  if (bboxCache.size >= MAX_BBOX_PAGES) {
    const oldest = bboxCache.keys().next().value;
    if (oldest !== undefined) bboxCache.delete(oldest);
  }
  bboxCache.set(page, bboxes);
}

export function warmBboxCache(pages: Iterable<number>, loader: (page: number) => Promise<AyahBbox[]>): void {
  for (const page of pages) {
    if (bboxCache.has(page)) continue;
    void loader(page).then((bboxes) => {
      if (bboxes.length > 0) setCachedBboxes(page, bboxes);
    });
  }
}
