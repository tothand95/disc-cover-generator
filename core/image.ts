import sharp from "sharp";
import type { FitMode } from "./types.js";

const MM_PER_INCH = 25.4;

export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm / MM_PER_INCH) * dpi);
}

export async function renderImageToSize(
  imagePath: string,
  widthMm: number,
  heightMm: number,
  fit: FitMode,
  dpi: number,
): Promise<Buffer> {
  const widthPx = mmToPx(widthMm, dpi);
  const heightPx = mmToPx(heightMm, dpi);

  const sharpFit: "fill" | "cover" | "contain" =
    fit === "stretch" ? "fill" : fit === "fill" ? "cover" : "contain";

  return sharp(imagePath)
    .resize({
      width: widthPx,
      height: heightPx,
      fit: sharpFit,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();
}
