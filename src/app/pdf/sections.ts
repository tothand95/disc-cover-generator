import type { CasePreset } from '@core/types';
import { renderImageToPng, renderFrontToPng } from '../utils/image';
import { rasterizeSpineSvg } from '../utils/spine/rasterize';
import { loadSpinePresetImage, type SpinePresetImageKey } from '../utils/spine/assets';
import { mmToPx } from './layout';
import type { GenerateBrowserOptions } from './generate';

export interface Section {
  xMm: number;
  widthMm: number;
  png: Uint8Array;
}

function getFrontPresetImageKey(opts: GenerateBrowserOptions): SpinePresetImageKey | null {
  if (opts.input.kind !== 'three') return null;
  const spine = opts.input.spinePreset;
  if (!spine || !spine.extras?.showFrontImage) return null;
  if (spine.preset === 'ps2' || spine.preset === 'xbox') return spine.preset;
  return null;
}

export async function buildSections(preset: CasePreset, opts: GenerateBrowserOptions): Promise<Section[]> {
  const { dpi, fit, fitBackground } = opts;
  const h = preset.heightMm;
  const spineW = preset.spineWidthMm;
  const sideW = (preset.totalWidthMm - spineW) / 2;

  if (opts.input.kind === 'single') {
    const png = await renderImageToPng({
      file: opts.input.image,
      widthPx: mmToPx(preset.totalWidthMm, dpi),
      heightPx: mmToPx(h, dpi),
      fit,
      fitBackground,
    });
    return [{ xMm: 0, widthMm: preset.totalWidthMm, png }];
  }

  const three = opts.input;
  const frontPresetKey = getFrontPresetImageKey(opts);
  const frontPresetImage = frontPresetKey ? await loadSpinePresetImage(frontPresetKey, 'front') : null;
  const widening = three.spinePreset?.extras?.frontImageWidening ?? 0;
  const frontWideningPx = widening > 0 ? Math.round((widening * dpi) / 300) : 0;
  const frontSeparatorPx = frontPresetKey === 'ps2' && three.spinePreset?.extras?.showFrontSeparator ? Math.max(1, Math.round((4 * dpi) / 300)) : 0;

  const sideWpx = mmToPx(sideW, dpi);
  const sideHpx = mmToPx(h, dpi);
  const [backPng, frontPng] = await Promise.all([
    renderImageToPng({
      file: three.back,
      widthPx: sideWpx,
      heightPx: sideHpx,
      fit,
      fitBackground,
    }),
    renderFrontToPng({
      file: three.front,
      widthPx: sideWpx,
      heightPx: sideHpx,
      fit,
      fitBackground,
      topLayer: frontPresetImage
        ? {
            href: frontPresetImage.href,
            aspectRatio: frontPresetImage.aspectRatio,
            topPaddingPx: frontWideningPx,
            bottomPaddingPx: frontWideningPx,
            separator: frontSeparatorPx > 0 ? { color: '#ffffff', heightPx: frontSeparatorPx } : undefined,
          }
        : undefined,
    }),
  ]);

  let spineSection: Section;
  if (three.spineImage) {
    const spinePng = await renderImageToPng({
      file: three.spineImage,
      widthPx: mmToPx(spineW, dpi),
      heightPx: mmToPx(h, dpi),
      fit,
      fitBackground,
    });
    spineSection = { xMm: sideW, widthMm: spineW, png: spinePng };
  } else if (three.spinePreset) {
    const spinePng = await rasterizeSpineSvg({
      spine: three.spinePreset,
      widthPx: mmToPx(spineW, dpi),
      heightPx: mmToPx(h, dpi),
    });
    spineSection = { xMm: sideW, widthMm: spineW, png: spinePng };
  } else {
    throw new Error('Three-image mode requires either a spine image or a spine preset.');
  }

  return [{ xMm: 0, widthMm: sideW, png: backPng }, spineSection, { xMm: sideW + spineW, widthMm: sideW, png: frontPng }];
}
