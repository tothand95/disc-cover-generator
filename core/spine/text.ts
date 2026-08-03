import sharp from "sharp";
import type { SpinePresetInput } from "../types.js";
import { mmToPx } from "../image.js";
import type { RenderedSpine } from "./index.js";

export async function renderBlankSpine(
  spine: SpinePresetInput,
  widthMm: number,
  heightMm: number,
  dpi: number,
): Promise<RenderedSpine> {
  const widthPx = mmToPx(widthMm, dpi);
  const heightPx = mmToPx(heightMm, dpi);
  const bg = spine.extras?.backgroundColor || "#ffffff";
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">
  <rect width="100%" height="100%" fill="${bg}"/>
</svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return { png };
}

export async function renderTextSpine(
  spine: SpinePresetInput,
  widthMm: number,
  heightMm: number,
  dpi: number,
): Promise<RenderedSpine> {
  const widthPx = mmToPx(widthMm, dpi);
  const heightPx = mmToPx(heightMm, dpi);
  const bg = spine.extras?.backgroundColor || "#ffffff";
  const textColor = spine.extras?.textColor || "#000000";
  const align = spine.extras?.textAlign || "center";
  const title = escapeXml(spine.title || "");
  const fontSizePx = Math.max(12, Math.floor(widthPx * 0.55));

  // Spine reads top-to-bottom (rotate 90 clockwise). In the pre-rotation frame,
  // the "along the spine" axis becomes horizontal x. So align.start = left of
  // pre-rotation = top of spine; align.end = right = bottom of spine.
  // Add a small edge padding equal to font size so text doesn't touch the ends.
  const pad = fontSizePx;
  let x: number;
  let anchor: string;
  if (align === "start") {
    x = -heightPx / 2 + pad;
    anchor = "start";
  } else if (align === "end") {
    x = heightPx / 2 - pad;
    anchor = "end";
  } else {
    x = 0;
    anchor = "middle";
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">
  <rect width="100%" height="100%" fill="${bg}"/>
  <g transform="translate(${widthPx / 2} ${heightPx / 2}) rotate(90)">
    <text x="${x}" y="0" fill="${textColor}" font-family="Arial, Helvetica, sans-serif" font-weight="bold"
          font-size="${fontSizePx}" text-anchor="${anchor}" dominant-baseline="middle">${title}</text>
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
