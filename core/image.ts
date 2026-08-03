import sharp from "sharp";
import type { FitMode } from "./types.js";

const MM_PER_INCH = 25.4;

export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm / MM_PER_INCH) * dpi);
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace(/^#/, "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return {
    r: parseInt(full.slice(0, 2), 16) || 0,
    g: parseInt(full.slice(2, 4), 16) || 0,
    b: parseInt(full.slice(4, 6), 16) || 0,
  };
}

export async function renderImageToSize(
  imagePath: string,
  widthMm: number,
  heightMm: number,
  fit: FitMode,
  dpi: number,
  fitBackground?: string,
): Promise<Buffer> {
  const widthPx = mmToPx(widthMm, dpi);
  const heightPx = mmToPx(heightMm, dpi);

  const sharpFit: "fill" | "cover" | "contain" =
    fit === "stretch" ? "fill" : fit === "fill" ? "cover" : "contain";

  const bg =
    fit === "fit" && fitBackground
      ? { ...parseHex(fitBackground), alpha: 1 }
      : { r: 255, g: 255, b: 255, alpha: 0 };

  return sharp(imagePath)
    .resize({
      width: widthPx,
      height: heightPx,
      fit: sharpFit,
      background: bg,
    })
    .png()
    .toBuffer();
}
