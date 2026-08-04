import type { FitMode } from "../../../core/types";

async function drawFileToCanvas(
  file: File,
  widthPx: number,
  heightPx: number,
  fit: FitMode,
  fitBackground: string,
): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to acquire 2D canvas context");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (fit === "fit") {
      ctx.fillStyle = fitBackground;
      ctx.fillRect(0, 0, widthPx, heightPx);
    }

    const srcW = bitmap.width;
    const srcH = bitmap.height;

    if (fit === "stretch") {
      ctx.drawImage(bitmap, 0, 0, widthPx, heightPx);
    } else {
      const srcRatio = srcW / srcH;
      const dstRatio = widthPx / heightPx;
      let dw: number;
      let dh: number;
      if ((fit === "fill") === (srcRatio > dstRatio)) {
        dh = heightPx;
        dw = dh * srcRatio;
      } else {
        dw = widthPx;
        dh = dw / srcRatio;
      }
      const dx = (widthPx - dw) / 2;
      const dy = (heightPx - dh) / 2;
      ctx.drawImage(bitmap, dx, dy, dw, dh);
    }
    return canvas;
  } finally {
    bitmap.close();
  }
}

async function canvasToPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob returned null"))),
      "image/png",
    );
  });
  return new Uint8Array(await blob.arrayBuffer());
}

/** Draw an image file into a canvas at the target pixel size using the fit mode. */
export async function renderImageToPng(
  file: File,
  widthPx: number,
  heightPx: number,
  fit: FitMode,
  fitBackground: string,
): Promise<Uint8Array> {
  const canvas = await drawFileToCanvas(file, widthPx, heightPx, fit, fitBackground);
  return canvasToPng(canvas);
}

/**
 * Draw an image file, then overlay a preset "top" image spanning the full
 * width at y=0 with its aspect ratio preserved. Optionally adds a black
 * top border of `topPaddingPx` and a black bottom border of `bottomPaddingPx`
 * around the overlay to widen it (top edge always at y=0 — never bleeds up).
 * If `separatorHeightPx` > 0, a white separator line is drawn immediately
 * below the extended block.
 */
export async function renderImageWithPresetTopToPng(
  file: File,
  widthPx: number,
  heightPx: number,
  fit: FitMode,
  fitBackground: string,
  topImageHref: string,
  topImageAspectRatio: number,
  topPaddingPx: number,
  bottomPaddingPx: number,
  separatorHeightPx: number,
): Promise<Uint8Array> {
  const canvas = await drawFileToCanvas(file, widthPx, heightPx, fit, fitBackground);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to acquire 2D canvas context");

  const res = await fetch(topImageHref);
  if (!res.ok) throw new Error(`Failed to load preset top image: ${res.status}`);
  const blob = await res.blob();
  const topBitmap = await createImageBitmap(blob);
  try {
    const topHeightPx = widthPx / topImageAspectRatio;
    const totalHeight = topHeightPx + topPaddingPx + bottomPaddingPx;
    if (topPaddingPx > 0 || bottomPaddingPx > 0) {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, widthPx, totalHeight);
    }
    ctx.drawImage(topBitmap, 0, topPaddingPx, widthPx, topHeightPx);
    if (separatorHeightPx > 0) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, totalHeight, widthPx, separatorHeightPx);
    }
  } finally {
    topBitmap.close();
  }
  return canvasToPng(canvas);
}
