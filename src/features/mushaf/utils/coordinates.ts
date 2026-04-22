import { AyahBbox } from "../../quran/type";
import { Rect } from '../types/mushaf';

/**
 * Calculates the scale and offset to fit an image within a container while maintaining aspect ratio (contain).
 * We need this to correctly map the bbox coordinates to the actual displayed image position.
 */
export type ScaleMode = 'contain' | 'cover';

/**
 * Calculates the scale and offset to fit an image within a container.
 * 'contain' fits the entire image within the container.
 * 'cover' fills the entire container, potentially clipping the image.
 */
export const calculateScale = (
  containerWidth: number,
  containerHeight: number,
  naturalWidth: number,
  naturalHeight: number,
  mode: ScaleMode = 'cover'
) => {
  if (!containerWidth || !containerHeight || !naturalWidth || !naturalHeight) {
    return { scale: 1, offsetX: 0, offsetY: 0 };
  }

  const widthScale = containerWidth / naturalWidth;
  const heightScale = containerHeight / naturalHeight;
  
  // Use Math.min for 'contain', Math.max for 'cover'
  const scale = mode === 'contain' ? Math.min(widthScale, heightScale) : Math.max(widthScale, heightScale);
  
  // Calculate offsets to center the image
  const offsetX = (containerWidth - naturalWidth * scale) / 2;
  const offsetY = (containerHeight - naturalHeight * scale) / 2;

  return { scale, offsetX, offsetY };
};

/**
 * Transforms a raw bbox from the database to screen coordinates.
 */
export const transformBbox = (
  bbox: AyahBbox,
  scale: number,
  offsetX: number,
  offsetY: number
): Rect => {
  return {
    x: bbox.min_x * scale + offsetX,
    y: bbox.min_y * scale + offsetY,
    width: (bbox.max_x - bbox.min_x) * scale,
    height: (bbox.max_y - bbox.min_y) * scale,
  };
};

/**
 * Checks if a point (x, y) is inside a Rect.
 */
export const isPointInRect = (px: number, py: number, rect: Rect) => {
  return (
    px >= rect.x &&
    px <= rect.x + rect.width &&
    py >= rect.y &&
    py <= rect.y + rect.height
  );
};
