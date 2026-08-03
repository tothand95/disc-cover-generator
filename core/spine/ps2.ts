import sharp from "sharp";
import type { SpinePresetInput } from "../types.js";
import { mmToPx } from "../image.js";
import type { RenderedSpine } from "./index.js";

/**
 * PS2 spine renderer — initial placeholder.
 * Final version will include the "PlayStation 2" wordmark and "PS2" disc logo.
 */
export async function renderPs2Spine(
  spine: SpinePresetInput,
  widthMm: number,
  heightMm: number,
  dpi: number,
): Promise<RenderedSpine> {
  const widthPx = mmToPx(widthMm, dpi);
  const heightPx = mmToPx(heightMm, dpi);
  const title = escapeXml(spine.title || "");
  const fontSizePx = Math.max(12, Math.floor(widthPx * 0.55));

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">
  <rect width="100%" height="100%" fill="#003791"/>
  <g transform="translate(${widthPx / 2} ${heightPx / 2}) rotate(-90)">
    <text x="0" y="0" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-weight="bold"
          font-size="${fontSizePx}" text-anchor="middle" dominant-baseline="middle">${title}</text>
  </g>
</svg>`;

  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return { png };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
