/**
 * Choosing which part of an image survives being cropped into a card.
 *
 * Cards force six different aspect ratios across the site (video, square, 3/1,
 * 16/7, 16/6, 4/3) and every one of them uses object-cover, which crops from the
 * centre. A portrait piece dropped into a 3/1 banner slot therefore loses almost
 * all of its height, which is why heads get cut off on cards while the post view
 * — which honours the true ratio — looks correct.
 *
 * A single cropped thumbnail cannot fix that: whatever ratio it was cropped to
 * is wrong in the other five slots. A focal point can, because object-position
 * re-anchors the same crop in every ratio. One pair of percentages, stored with
 * the image, used everywhere.
 */

export interface FocusableImage {
  url: string;
  /** Horizontal focus, 0–100. Defaults to centre when unset. */
  focalX?: number;
  /** Vertical focus, 0–100. Defaults to centre when unset. */
  focalY?: number;
}

export const DEFAULT_FOCAL_X = 50;
export const DEFAULT_FOCAL_Y = 50;

const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

/**
 * Style for an `object-cover` image. Safe to spread onto anything — an image
 * with no focal point returns dead-centre, which is what the browser does anyway.
 */
export function focalStyle(image?: FocusableImage | null): { objectPosition: string } {
  const x = clamp(image?.focalX ?? DEFAULT_FOCAL_X);
  const y = clamp(image?.focalY ?? DEFAULT_FOCAL_Y);
  return { objectPosition: `${x}% ${y}%` };
}

/** True when the author has actually chosen a point, rather than inheriting centre. */
export function hasFocalPoint(image?: FocusableImage | null): boolean {
  return typeof image?.focalX === 'number' || typeof image?.focalY === 'number';
}
