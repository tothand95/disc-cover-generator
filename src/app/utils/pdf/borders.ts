import { rgb, type PDFPage } from 'pdf-lib';
import type { BorderOptions, CasePreset } from '@core/types';
import { parseHex } from '../color';
import { MM_PER_INCH, mmToPt } from './layout';
import type { Section } from './sections';

export function drawBorders(
  page: PDFPage,
  sections: Section[],
  preset: CasePreset,
  wrapOriginXmm: number,
  wrapOriginYmm: number,
  border: BorderOptions,
  dpi: number,
): void {
  if (border.mode === 'none' || border.thicknessPx <= 0) {
    return;
  }

  const color = parseHex(border.color);
  const strokeColor = rgb(color.r, color.g, color.b);
  const thicknessMm = (border.thicknessPx / dpi) * MM_PER_INCH;
  const thicknessPt = mmToPt(thicknessMm);
  const half = thicknessMm / 2;
  const wrapWidth = preset.totalWidthMm;
  const wrapHeight = preset.heightMm;

  page.drawRectangle({
    x: mmToPt(wrapOriginXmm - half),
    y: mmToPt(wrapOriginYmm - half),
    width: mmToPt(wrapWidth + thicknessMm),
    height: mmToPt(wrapHeight + thicknessMm),
    borderColor: strokeColor,
    borderWidth: thicknessPt,
  });

  if (border.mode === 'sections' && sections.length > 1) {
    for (let i = 1; i < sections.length; i++) {
      const xMm = wrapOriginXmm + sections[i]!.xMm;
      page.drawLine({
        start: { x: mmToPt(xMm), y: mmToPt(wrapOriginYmm) },
        end: { x: mmToPt(xMm), y: mmToPt(wrapOriginYmm + wrapHeight) },
        color: strokeColor,
        thickness: thicknessPt,
      });
    }
  }
}
