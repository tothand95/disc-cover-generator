import sharp from "sharp";
import type { SpinePresetInput } from "../types.js";
import { mmToPx } from "../image.js";
import type { RenderedSpine } from "./index.js";
import { spineFontStyleBlock, SPINE_FONT_FAMILY } from "./font.js";

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
  const style = await spineFontStyleBlock();

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">
  ${style}
  <rect width="100%" height="100%" fill="#ffffff"/>
  <g transform="translate(${widthPx / 2} ${heightPx / 2}) rotate(90)">
    <text x="0" y="0" fill="#000000" font-family="${SPINE_FONT_FAMILY}" font-weight="600"
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
