import type { CasePreset } from '@core/types';
import { renderImageToPng, renderFrontToPng } from '../image';
import { rasterizeSpineSvg } from '../spine/rasterize';
import { loadSpinePresetImage, type SpinePresetImageKey } from '../spine/assets';
import { mmToPx } from './layout';
import type { GenerateBrowserOptions } from './generate';

export interface Section {
  xMm: number;
  widthMm: number;
  png: Uint8Array;
}

function getFrontPresetImageKey(options: GenerateBrowserOptions): SpinePresetImageKey | null {
  if (options.input.kind !== 'three') {
    return null;
  }
  const spine = options.input.spinePreset;
  if (!spine || !spine.extras?.showFrontImage) {
    return null;
  }
  if (spine.preset === 'ps2' || spine.preset === 'xbox') {
    return spine.preset;
  }
  return null;
}

export async function buildSections(preset: CasePreset, options: GenerateBrowserOptions): Promise<Section[]> {
  const { dpi, fit, fitBackground } = options;
  const heightMm = preset.heightMm;
  const spineWidthMm = preset.spineWidthMm;
  const sideWidthMm = (preset.totalWidthMm - spineWidthMm) / 2;

  if (options.input.kind === 'single') {
    const png = await renderImageToPng({
      file: options.input.image,
      widthPx: mmToPx(preset.totalWidthMm, dpi),
      heightPx: mmToPx(heightMm, dpi),
      fit,
      fitBackground,
    });
    return [{ xMm: 0, widthMm: preset.totalWidthMm, png }];
  }

  const three = options.input;
  const frontPresetKey = getFrontPresetImageKey(options);
  const frontPresetImage = frontPresetKey ? await loadSpinePresetImage(frontPresetKey, 'front') : null;
  const widening = three.spinePreset?.extras?.frontImageWidening ?? 0;
  const frontWideningPx = widening > 0 ? Math.round((widening * dpi) / 300) : 0;
  const frontSeparatorPx = frontPresetKey === 'ps2' && three.spinePreset?.extras?.showFrontSeparator ? Math.max(1, Math.round((4 * dpi) / 300)) : 0;

  const sideWidthPx = mmToPx(sideWidthMm, dpi);
  const sideHeightPx = mmToPx(heightMm, dpi);
  const [backPng, frontPng] = await Promise.all([
    renderImageToPng({
      file: three.back,
      widthPx: sideWidthPx,
      heightPx: sideHeightPx,
      fit,
      fitBackground,
    }),
    renderFrontToPng({
      file: three.front,
      widthPx: sideWidthPx,
      heightPx: sideHeightPx,
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
      widthPx: mmToPx(spineWidthMm, dpi),
      heightPx: mmToPx(heightMm, dpi),
      fit,
      fitBackground,
    });
    spineSection = { xMm: sideWidthMm, widthMm: spineWidthMm, png: spinePng };
  } else if (three.spinePreset) {
    const spinePng = await rasterizeSpineSvg({
      spine: three.spinePreset,
      widthPx: mmToPx(spineWidthMm, dpi),
      heightPx: mmToPx(heightMm, dpi),
    });
    spineSection = { xMm: sideWidthMm, widthMm: spineWidthMm, png: spinePng };
  } else {
    throw new Error('Three-image mode requires either a spine image or a spine preset.');
  }

  return [{ xMm: 0, widthMm: sideWidthMm, png: backPng }, spineSection, { xMm: sideWidthMm + spineWidthMm, widthMm: sideWidthMm, png: frontPng }];
}
