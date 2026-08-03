import { buildSpineSvg } from "../../../core/spine/svg";
import type { SpinePresetInput } from "../../../core/types";
import { resolveSpineSvgOptions } from "./spineOptions";

interface RasterizeOptions {
  spine: SpinePresetInput;
  widthPx: number;
  heightPx: number;
}

/**
 * Render a spine SVG through the browser rasterizer so both preview and PDF
 * consume the exact same pixels. Uses an inline data-URL <img> loaded into a
 * canvas of the requested size.
 */
export async function rasterizeSpineSvg(opts: RasterizeOptions): Promise<Uint8Array> {
  const { spine, widthPx, heightPx } = opts;
  const svg = buildSpineSvg(await resolveSpineSvgOptions(spine, widthPx, heightPx));

  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Failed to load spine SVG"));
      el.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to acquire 2D canvas context");
    ctx.drawImage(img, 0, 0, widthPx, heightPx);

    const png: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob returned null"))),
        "image/png",
      );
    });
    return new Uint8Array(await png.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}
