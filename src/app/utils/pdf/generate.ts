import { PDFDocument } from 'pdf-lib';
import type { BorderOptions, CasePresetId, FitMode, SpinePresetInput } from '@core/types';
import { getPreset } from '@core/presets';
import { A4_HEIGHT_MM, A4_WIDTH_MM, BLEED_MM, mmToPt } from './layout';
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

export async function generateCoverPdfInBrowser(options: GenerateBrowserOptions): Promise<Uint8Array> {
  const preset = getPreset(options.presetId);
  const wrapWidthMm = preset.totalWidthMm + BLEED_MM * 2;
  const wrapHeightMm = preset.heightMm + BLEED_MM * 2;
  if (wrapWidthMm > A4_WIDTH_MM || wrapHeightMm > A4_HEIGHT_MM) {
    throw new Error(`Cover (${wrapWidthMm.toFixed(1)}x${wrapHeightMm.toFixed(1)}mm incl. bleed) does not fit on A4 landscape.`);
  }

  const sections = await buildSections(preset, options);

  const offsetXmm = (A4_WIDTH_MM - wrapWidthMm) / 2 + BLEED_MM;
  const offsetYmm = (A4_HEIGHT_MM - wrapHeightMm) / 2 + BLEED_MM;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([mmToPt(A4_WIDTH_MM), mmToPt(A4_HEIGHT_MM)]);

  for (const section of sections) {
    const image = await pdf.embedPng(section.png);
    page.drawImage(image, {
      x: mmToPt(offsetXmm + section.xMm),
      y: mmToPt(offsetYmm),
      width: mmToPt(section.widthMm),
      height: mmToPt(preset.heightMm),
    });
  }

  drawBorders(page, sections, preset, offsetXmm, offsetYmm, options.border, options.dpi);

  return pdf.save();
}
