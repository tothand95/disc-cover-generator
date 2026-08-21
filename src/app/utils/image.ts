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

async function drawFileToCanvas(options: RenderImageOptions): Promise<HTMLCanvasElement> {
  const { file, widthPx, heightPx, fit, fitBackground } = options;
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

    const sourceWidth = bitmap.width;
    const sourceHeight = bitmap.height;

    if (fit === 'stretch') {
      ctx.drawImage(bitmap, 0, 0, widthPx, heightPx);
    } else {
      const sourceRatio = sourceWidth / sourceHeight;
      const destRatio = widthPx / heightPx;
      let drawWidth: number;
      let drawHeight: number;
      if ((fit === 'fill') === sourceRatio > destRatio) {
        drawHeight = heightPx;
        drawWidth = drawHeight * sourceRatio;
      } else {
        drawWidth = widthPx;
        drawHeight = drawWidth / sourceRatio;
      }
      const drawX = (widthPx - drawWidth) / 2;
      const drawY = (heightPx - drawHeight) / 2;
      ctx.drawImage(bitmap, drawX, drawY, drawWidth, drawHeight);
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
export async function renderImageToPng(options: RenderImageOptions): Promise<Uint8Array> {
  const canvas = await drawFileToCanvas(options);
  return canvasToPng(canvas);
}

/**
 * Draw a front-cover image, optionally overlaying a preset "top" image
 * that spans the full width at y=0 with its aspect ratio preserved. Optional
 * padding widens the top block with black bars (top edge stays flush with
 * the cover — never bleeds up). Optional separator draws a colored line
 * immediately below the extended block.
 */
export async function renderFrontToPng(options: RenderFrontOptions): Promise<Uint8Array> {
  const canvas = await drawFileToCanvas(options);
  if (!options.topLayer) {
    return canvasToPng(canvas);
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to acquire 2D canvas context');
  }

  const { href, aspectRatio, topPaddingPx = 0, bottomPaddingPx = 0, separator } = options.topLayer;
  const response = await fetch(href);
  if (!response.ok) {
    throw new Error(`Failed to load preset top image: ${response.status}`);
  }
  const blob = await response.blob();
  const topBitmap = await createImageBitmap(blob);
  try {
    const topHeightPx = options.widthPx / aspectRatio;
    const totalHeight = topHeightPx + topPaddingPx + bottomPaddingPx;
    if (topPaddingPx > 0 || bottomPaddingPx > 0) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, options.widthPx, totalHeight);
    }
    ctx.drawImage(topBitmap, 0, topPaddingPx, options.widthPx, topHeightPx);
    if (separator && separator.heightPx > 0) {
      ctx.fillStyle = separator.color;
      ctx.fillRect(0, totalHeight, options.widthPx, separator.heightPx);
    }
  } finally {
    topBitmap.close();
  }
  return canvasToPng(canvas);
}
