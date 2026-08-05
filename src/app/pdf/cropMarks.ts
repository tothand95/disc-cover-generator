import { rgb, LineCapStyle, type PDFPage } from 'pdf-lib';
import type { CasePreset } from '@core/types';
import { mmToPt } from './layout';

export function drawCropMarks(
  page: PDFPage,
  wrapOriginXmm: number,
  wrapOriginYmm: number,
  preset: CasePreset,
): void {
  const markLenMm = 6;
  const x0 = mmToPt(wrapOriginXmm);
  const y0 = mmToPt(wrapOriginYmm);
  const x1 = mmToPt(wrapOriginXmm + preset.totalWidthMm);
  const y1 = mmToPt(wrapOriginYmm + preset.heightMm);
  const len = mmToPt(markLenMm);
  const grey = rgb(0.25, 0.25, 0.25);
  const thickness = 0.5;
  const dashArray = [0.01, 2];

  const line = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    page.drawLine({
      start: a,
      end: b,
      color: grey,
      thickness,
      dashArray,
      lineCap: LineCapStyle.Round,
    });

  line({ x: x0 - len, y: y0 }, { x: x0, y: y0 });
  line({ x: x1, y: y0 }, { x: x1 + len, y: y0 });
  line({ x: x0 - len, y: y1 }, { x: x0, y: y1 });
  line({ x: x1, y: y1 }, { x: x1 + len, y: y1 });
  line({ x: x0, y: y0 - len }, { x: x0, y: y0 });
  line({ x: x0, y: y1 }, { x: x0, y: y1 + len });
  line({ x: x1, y: y0 - len }, { x: x1, y: y0 });
  line({ x: x1, y: y1 }, { x: x1, y: y1 + len });

  const sideWmm = (preset.totalWidthMm - preset.spineWidthMm) / 2;
  const spineLeft = mmToPt(wrapOriginXmm + sideWmm);
  const spineRight = mmToPt(wrapOriginXmm + sideWmm + preset.spineWidthMm);
  line({ x: spineLeft, y: y0 - len }, { x: spineLeft, y: y0 });
  line({ x: spineLeft, y: y1 }, { x: spineLeft, y: y1 + len });
  line({ x: spineRight, y: y0 - len }, { x: spineRight, y: y0 });
  line({ x: spineRight, y: y1 }, { x: spineRight, y: y1 + len });
}
