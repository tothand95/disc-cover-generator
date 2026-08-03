/**
 * Pure spine SVG builder. Shared between server (rasterized via sharp) and
 * web preview (rendered inline). No Node-only imports so it works in both.
 *
 * Visual centering strategy: use dominant-baseline="alphabetic" (baseline at
 * the given y) and position the baseline at cap-height/2 BELOW the spine
 * centerline, so uppercase glyphs are perfectly centered on the spine axis.
 * Cap-height for the bundled Hind SemiBold is 700/1000 units.
 */
export type SpineTextAlign = "start" | "center" | "end";

export const SPINE_FONT_FAMILY = "SpineFont";
export const HIND_CAP_HEIGHT_RATIO = 0.7;

export interface SpineSvgOptions {
  title: string;
  widthPx: number;
  heightPx: number;
  bg: string;
  textColor: string;
  align: SpineTextAlign;
  /**
   * Optional <style> block with @font-face declarations. Server-side needs to
   * embed the font as a data URI so librsvg can render it without fontconfig.
   * Web-side leaves this empty and relies on the browser's loaded font.
   */
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

  // Baseline is placed below the pre-rotation origin by capHeight/2 so the
  // vertical center of uppercase glyphs lands exactly on the origin (which
  // becomes the spine centerline after the rotation).
  const baselineOffset = fontSizePx * (HIND_CAP_HEIGHT_RATIO / 2);

  const textElement = title
    ? `<text x="${x}" y="${baselineOffset}" fill="${textColor}" font-family="${SPINE_FONT_FAMILY}" font-weight="600" font-size="${fontSizePx}" text-anchor="${anchor}" dominant-baseline="alphabetic">${escapeXml(title)}</text>`
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
