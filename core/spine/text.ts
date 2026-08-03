import sharp from "sharp";
import type { SpinePresetInput } from "../types.js";
import { mmToPx } from "../image.js";
import type { RenderedSpine } from "./index.js";
import { spineFontStyleBlock } from "./font.js";
import { buildSpineSvg } from "./svg.js";

export async function renderBlankSpine(
  spine: SpinePresetInput,
  widthMm: number,
  heightMm: number,
  dpi: number,
): Promise<RenderedSpine> {
  const widthPx = mmToPx(widthMm, dpi);
  const heightPx = mmToPx(heightMm, dpi);
  const bg = spine.extras?.backgroundColor || "#ffffff";
  const svg = buildSpineSvg({
    title: "",
    widthPx,
    heightPx,
    bg,
    textColor: "#000000",
    align: "center",
  });
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
  const fontStyleBlock = await spineFontStyleBlock();
  const svg = buildSpineSvg({
    title: spine.title || "",
    widthPx,
    heightPx,
    bg: spine.extras?.backgroundColor || "#ffffff",
    textColor: spine.extras?.textColor || "#000000",
    align: spine.extras?.textAlign || "center",
    fontStyleBlock,
  });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return { png };
}

export async function renderPs2SpineText(
  spine: SpinePresetInput,
  widthMm: number,
  heightMm: number,
  dpi: number,
): Promise<RenderedSpine> {
  const widthPx = mmToPx(widthMm, dpi);
  const heightPx = mmToPx(heightMm, dpi);
  const fontStyleBlock = await spineFontStyleBlock();
  const svg = buildSpineSvg({
    title: spine.title || "",
    widthPx,
    heightPx,
    bg: "#ffffff",
    textColor: "#000000",
    align: "center",
    fontStyleBlock,
  });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return { png };
}
