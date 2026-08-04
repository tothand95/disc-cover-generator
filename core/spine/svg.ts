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
export const HIND_CAP_HEIGHT_RATIO = 0.7;
export const VISUAL_CENTER_RATIO = 0.33;
/** Gap in viewBox pixels between the spine preset image and the text below it. */
export const TOP_IMAGE_TEXT_GAP_PX = 28;

export interface SpinePresetImage {
  /** Image source — data URI recommended so rasterization is self-contained. */
  href: string;
  /** Natural width / natural height of the image. */
  aspectRatio: number;
}

export interface SpineSvgOptions {
  title: string;
  widthPx: number;
  heightPx: number;
  bg: string;
  textColor: string;
  align: SpineTextAlign;
  fontStyleBlock?: string;
  /**
   * When set, the image is rendered filling the spine width at the top of
   * the spine, and the title (if any) runs top-to-bottom starting
   * TOP_IMAGE_TEXT_GAP_PX below the image. `align` is ignored in this mode.
   */
  presetImage?: SpinePresetImage;
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
  const { title, widthPx, heightPx, bg, textColor, align, fontStyleBlock, presetImage } = opts;
  const fontSizePx = Math.max(6, Math.floor(widthPx * 0.55));
  const pad = fontSizePx;

  const y = fontSizePx * VISUAL_CENTER_RATIO;

  let textGroup = "";
  if (presetImage) {
    const imgHeight = widthPx / presetImage.aspectRatio;
    const rotateOriginY = imgHeight + TOP_IMAGE_TEXT_GAP_PX;
    const escapedHref = escapeXml(presetImage.href);
    const imageEl = `<image href="${escapedHref}" x="0" y="0" width="${widthPx}" height="${imgHeight}" preserveAspectRatio="xMidYMin meet"/>`;
    const textEl = title
      ? `<g transform="translate(${widthPx / 2} ${rotateOriginY}) rotate(90)"><text x="0" y="${y}" fill="${textColor}" font-family="${SPINE_FONT_FAMILY}" font-weight="600" font-size="${fontSizePx}" text-anchor="start" dominant-baseline="alphabetic">${escapeXml(title)}</text></g>`
      : "";
    textGroup = imageEl + textEl;
  } else {
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
    const textElement = title
      ? `<text x="${x}" y="${y}" fill="${textColor}" font-family="${SPINE_FONT_FAMILY}" font-weight="600" font-size="${fontSizePx}" text-anchor="${anchor}" dominant-baseline="alphabetic">${escapeXml(title)}</text>`
      : "";
    textGroup = `<g transform="translate(${widthPx / 2} ${heightPx / 2}) rotate(90)">${textElement}</g>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">
  ${fontStyleBlock ?? ""}
  <rect width="100%" height="100%" fill="${bg}"/>
  ${textGroup}
</svg>`;
}
