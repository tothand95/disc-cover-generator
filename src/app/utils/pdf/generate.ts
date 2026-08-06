import { PDFDocument } from 'pdf-lib';
import type { BorderOptions, CasePresetId, FitMode, SpinePresetInput } from '@core/types';
import { getPreset } from '@core/presets';
import { A4_HEIGHT_MM, A4_WIDTH_MM, mmToPt } from './layout';
import { drawCropMarks } from './cropMarks';
import { drawBorders } from './borders';
import { buildSections } from './sections';

export interface SingleInput {
  kind: 'single';
  image: File;
}
export interface ThreeInput {
  kind: 'three';
  back: File;
  front: File;
  spineImage: File | null;
  spinePreset: SpinePresetInput | null;
}

export interface GenerateBrowserOptions {
  presetId: CasePresetId;
  input: SingleInput | ThreeInput;
  fit: FitMode;
  border: BorderOptions;
  fitBackground: string;
  dpi: number;
}

export async function generateCoverPdfInBrowser(opts: GenerateBrowserOptions): Promise<Uint8Array> {
  const preset = getPreset(opts.presetId);
  const bleedMm = preset.defaultBleedMm;
  const wrapWidthMm = preset.totalWidthMm + bleedMm * 2;
  const wrapHeightMm = preset.heightMm + bleedMm * 2;
  if (wrapWidthMm > A4_WIDTH_MM || wrapHeightMm > A4_HEIGHT_MM) {
    throw new Error(`Cover (${wrapWidthMm.toFixed(1)}x${wrapHeightMm.toFixed(1)}mm incl. bleed) does not fit on A4 landscape.`);
  }

  const sections = await buildSections(preset, opts);

  const offsetXmm = (A4_WIDTH_MM - wrapWidthMm) / 2 + bleedMm;
  const offsetYmm = (A4_HEIGHT_MM - wrapHeightMm) / 2 + bleedMm;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([mmToPt(A4_WIDTH_MM), mmToPt(A4_HEIGHT_MM)]);

  drawCropMarks(page, offsetXmm, offsetYmm, preset);

  for (const section of sections) {
    const img = await pdf.embedPng(section.png);
    page.drawImage(img, {
      x: mmToPt(offsetXmm + section.xMm),
      y: mmToPt(offsetYmm),
      width: mmToPt(section.widthMm),
      height: mmToPt(preset.heightMm),
    });
  }

  drawBorders(page, sections, preset, offsetXmm, offsetYmm, opts.border, opts.dpi);

  return pdf.save();
}
