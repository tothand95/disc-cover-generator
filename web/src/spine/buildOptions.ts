import type { SpinePresetInput } from "../../../core/types";
import type { SpineSvgOptions, SpineTextAlign } from "../../../core/spine/svg";
import { loadSpinePresetImage } from "./assets";

/**
 * Translate a SpinePresetInput into concrete buildSpineSvg options, resolving
 * any preset-specific assets (spine preset image, colors, etc.). Shared by
 * the preview and the PDF rasterizer so both stay in sync.
 */
export async function resolveSpineSvgOptions(
  spine: SpinePresetInput,
  widthPx: number,
  heightPx: number,
): Promise<SpineSvgOptions> {
  if (spine.preset === "ps2" || spine.preset === "xbox") {
    const presetImage = await loadSpinePresetImage(spine.preset);
    return {
      title: spine.title || "",
      widthPx,
      heightPx,
      bg: "#ffffff",
      textColor: "#000000",
      align: "start",
      presetImage,
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
