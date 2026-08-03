import type { SpinePresetInput } from "../../../core/types";
import type { SpineSvgOptions, SpineTextAlign } from "../../../core/spine/svg";
import { loadPs2SpineImage } from "./spineAssets";

/**
 * Translate a SpinePresetInput into concrete buildSpineSvg options, resolving
 * any preset-specific assets (PS2 background image, PS2 colors, etc.). Shared
 * by the preview and the PDF rasterizer so both stay in sync.
 */
export async function resolveSpineSvgOptions(
  spine: SpinePresetInput,
  widthPx: number,
  heightPx: number,
): Promise<SpineSvgOptions> {
  if (spine.preset === "ps2") {
    const topImage = await loadPs2SpineImage();
    return {
      title: spine.title || "",
      widthPx,
      heightPx,
      bg: "#000000",
      textColor: "#ffffff",
      align: "start",
      topImage,
    };
  }

  const align: SpineTextAlign = spine.extras?.textAlign || "center";
  return {
    title: spine.preset === "blank" ? "" : spine.title || "",
    widthPx,
    heightPx,
    bg: spine.extras?.backgroundColor || "#ffffff",
    textColor: spine.extras?.textColor || "#000000",
    align,
  };
}
