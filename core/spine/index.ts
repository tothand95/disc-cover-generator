import type { SpinePresetInput } from "../types.js";
import { renderPs2Spine } from "./ps2.js";
import { renderBlankSpine, renderTextSpine } from "./text.js";

export interface RenderedSpine {
  png: Buffer;
}

export async function renderSpinePreset(
  spine: SpinePresetInput,
  widthMm: number,
  heightMm: number,
  dpi: number,
): Promise<RenderedSpine> {
  switch (spine.preset) {
    case "ps2":
      return renderPs2Spine(spine, widthMm, heightMm, dpi);
    case "blank":
      return renderBlankSpine(spine, widthMm, heightMm, dpi);
    case "text":
      return renderTextSpine(spine, widthMm, heightMm, dpi);
    case "ps1":
    case "xbox":
    case "xbox360":
      throw new Error(
        `Spine preset '${spine.preset}' is not implemented yet.`,
      );
    default:
      throw new Error(`Unknown spine preset: ${(spine as SpinePresetInput).preset}`);
  }
}
