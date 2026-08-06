import type { FitMode } from '@core/types';

export interface RenderImageOptions {
  file: File;
  widthPx: number;
  heightPx: number;
  fit: FitMode;
  fitBackground: string;
}

export interface FrontTopLayer {
  href: string;
  aspectRatio: number;
  topPaddingPx?: number;
  bottomPaddingPx?: number;
  separator?: { color: string; heightPx: number };
}

export interface RenderFrontOptions extends RenderImageOptions {
  topLayer?: FrontTopLayer;
}

async function drawFileToCanvas(opts: RenderImageOptions): Promise<HTMLCanvasElement> {
  const { file, widthPx, heightPx, fit, fitBackground } = opts;
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to acquire 2D canvas context');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (fit === 'fit') {
      ctx.fillStyle = fitBackground;
      ctx.fillRect(0, 0, widthPx, heightPx);
    }

    const srcW = bitmap.width;
    const srcH = bitmap.height;

    if (fit === 'stretch') {
      ctx.drawImage(bitmap, 0, 0, widthPx, heightPx);
    } else {
      const srcRatio = srcW / srcH;
      const dstRatio = widthPx / heightPx;
      let dw: number;
      let dh: number;
      if ((fit === 'fill') === srcRatio > dstRatio) {
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
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))), 'image/png');
  });
  return new Uint8Array(await blob.arrayBuffer());
}

/** Draw an image file into a canvas at the target pixel size using the fit mode. */
export async function renderImageToPng(opts: RenderImageOptions): Promise<Uint8Array> {
  const canvas = await drawFileToCanvas(opts);
  return canvasToPng(canvas);
}

/**
 * Draw a front-cover image, optionally overlaying a preset "top" image
 * that spans the full width at y=0 with its aspect ratio preserved. Optional
 * padding widens the top block with black bars (top edge stays flush with
 * the cover — never bleeds up). Optional separator draws a colored line
 * immediately below the extended block.
 */
export async function renderFrontToPng(opts: RenderFrontOptions): Promise<Uint8Array> {
  const canvas = await drawFileToCanvas(opts);
  if (!opts.topLayer) {
    return canvasToPng(canvas);
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to acquire 2D canvas context');
  }

  const { href, aspectRatio, topPaddingPx = 0, bottomPaddingPx = 0, separator } = opts.topLayer;
  const res = await fetch(href);
  if (!res.ok) {
    throw new Error(`Failed to load preset top image: ${res.status}`);
  }
  const blob = await res.blob();
  const topBitmap = await createImageBitmap(blob);
  try {
    const topHeightPx = opts.widthPx / aspectRatio;
    const totalHeight = topHeightPx + topPaddingPx + bottomPaddingPx;
    if (topPaddingPx > 0 || bottomPaddingPx > 0) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, opts.widthPx, totalHeight);
    }
    ctx.drawImage(topBitmap, 0, topPaddingPx, opts.widthPx, topHeightPx);
    if (separator && separator.heightPx > 0) {
      ctx.fillStyle = separator.color;
      ctx.fillRect(0, totalHeight, opts.widthPx, separator.heightPx);
    }
  } finally {
    topBitmap.close();
  }
  return canvasToPng(canvas);
}
