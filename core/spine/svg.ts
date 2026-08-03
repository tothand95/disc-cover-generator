/**
 * Pure spine SVG builder. Shared between server (rasterized via sharp) and
 * web preview (rendered inline). No Node-only imports so it works in both.
 *
 * Visual centering: dominant-baseline="alphabetic" with baseline placed at
 * y = fontSize * VISUAL_CENTER_RATIO below the rotation origin. The ratio
 * was tuned empirically for the bundled Hind SemiBold — see the align tests
 * that produced this constant.
 */
export type SpineTextAlign = "start" | "center" | "end";

export const SPINE_FONT_FAMILY = "SpineFont";
/** Kept for pdf.ts vector rendering — cap-height / em for Hind SemiBold. */
export const HIND_CAP_HEIGHT_RATIO = 0.7;
/** Empirically tuned baseline offset for visually-centered caps. */
export const VISUAL_CENTER_RATIO = 0.33;

export interface SpineSvgOptions {
  title: string;
  widthPx: number;
  heightPx: number;
  bg: string;
  textColor: string;
  align: SpineTextAlign;
  fontStyleBlock?: string;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildSpineSvg(opts: SpineSvgOptions): string {
  const { title, widthPx, heightPx, bg, textColor, align, fontStyleBlock } = opts;
  const fontSizePx = Math.max(6, Math.floor(widthPx * 0.55));
  const pad = fontSizePx;

  let x: number;
  let anchor: "start" | "middle" | "end";
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

  const y = fontSizePx * VISUAL_CENTER_RATIO;

  const textElement = title
    ? `<text x="${x}" y="${y}" fill="${textColor}" font-family="${SPINE_FONT_FAMILY}" font-weight="600" font-size="${fontSizePx}" text-anchor="${anchor}" dominant-baseline="alphabetic">${escapeXml(title)}</text>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">
  ${fontStyleBlock ?? ""}
  <rect width="100%" height="100%" fill="${bg}"/>
  <g transform="translate(${widthPx / 2} ${heightPx / 2}) rotate(90)">
    ${textElement}
  </g>
</svg>`;
}
