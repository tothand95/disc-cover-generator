import type { CasePreset } from '@core/types';
import { MM_PER_INCH } from './pdf/layout';

export interface StageLayout {
  stageWidth: number;
  stageHeight: number;
  mmToPx: number;
  spineWidthPx: number;
  sideWidthPx: number;
  sideWidthMm: number;
  padding: number;
}

/**
 * Compute the largest stage size that fits BOTH the container width and
 * height (object-fit: contain style) while preserving the preset's aspect
 * ratio, accounting for a labels row and padding.
 */
export function computeStageLayout(
  preset: CasePreset,
  containerWidth: number,
  containerHeight: number,
  labelsHeight: number,
  padding = 16,
  labelsGap = 32,
): StageLayout {
  const availableW = Math.max(0, containerWidth - padding * 2);
  const availableH = Math.max(0, containerHeight - padding * 2 - labelsHeight - labelsGap);
  const ratio = preset.totalWidthMm / preset.heightMm;

  let stageWidth = 0;
  let stageHeight = 0;
  if (availableW > 0 && availableH > 0) {
    if (availableW / availableH > ratio) {
      stageHeight = availableH;
      stageWidth = stageHeight * ratio;
    } else {
      stageWidth = availableW;
      stageHeight = stageWidth / ratio;
    }
  }

  const mmToPx = stageWidth / preset.totalWidthMm || 0;
  const sideWidthMm = (preset.totalWidthMm - preset.spineWidthMm) / 2;
  return {
    stageWidth,
    stageHeight,
    mmToPx,
    spineWidthPx: preset.spineWidthMm * mmToPx,
    sideWidthPx: sideWidthMm * mmToPx,
    sideWidthMm,
    padding,
  };
}

export function borderPreviewPx(borderMode: 'none' | 'outer' | 'sections', thicknessPx: number, mmToPx: number, dpi: number): number {
  if (borderMode === 'none' || thicknessPx <= 0) {
    return 0;
  }
  const borderMm = (thicknessPx / dpi) * MM_PER_INCH;
  return Math.max(1, borderMm * mmToPx);
}
