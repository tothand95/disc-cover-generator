import { buildSpineSvg } from '@core/spine/svg';
import type { SpinePresetInput } from '@core/types';
import { resolveSpineSvgOptions } from './buildOptions';
import { loadSpineFontStyleBlock, preloadSpineDocumentFonts } from './assets';

interface RasterizeOptions {
  spine: SpinePresetInput;
  widthPx: number;
  heightPx: number;
}

/**
 * Render a spine SVG through the browser rasterizer so both preview and PDF
 * consume the exact same pixels.
 */
export async function rasterizeSpineSvg(options: RasterizeOptions): Promise<Uint8Array> {
  const { spine, widthPx, heightPx } = options;
  const [svgOptions, fontStyleBlock] = await Promise.all([
    resolveSpineSvgOptions(spine, widthPx, heightPx),
    loadSpineFontStyleBlock(),
    preloadSpineDocumentFonts(),
  ]);
  const svg = buildSpineSvg({ ...svgOptions, fontStyleBlock });

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Failed to load spine SVG'));
      element.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to acquire 2D canvas context');
    }
    ctx.drawImage(image, 0, 0, widthPx, heightPx);

    const png: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))), 'image/png');
    });
    return new Uint8Array(await png.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}
