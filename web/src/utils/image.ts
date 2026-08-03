import type { FitMode } from "../../../core/types";

/** Draw an image file into a canvas at the target pixel size using the fit mode. */
export async function renderImageToPng(
  file: File,
  widthPx: number,
  heightPx: number,
  fit: FitMode,
  fitBackground: string,
): Promise<Uint8Array> {
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

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob returned null"))),
        "image/png",
      );
    });
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    bitmap.close();
  }
}
