import type { CasePreset } from "../../../core/types";
import { renderImageToPng } from "../utils/image";
import { rasterizeSpineSvg } from "../spine/rasterize";
import { mmToPx } from "./layout";
import type { GenerateBrowserOptions } from "./generate";

export interface Section {
  xMm: number;
  widthMm: number;
  png: Uint8Array;
}

export async function buildSections(
  preset: CasePreset,
  opts: GenerateBrowserOptions,
): Promise<Section[]> {
  const { dpi, fit, fitBackground } = opts;
  const h = preset.heightMm;
  const spineW = preset.spineWidthMm;
  const sideW = (preset.totalWidthMm - spineW) / 2;

  if (opts.input.kind === "single") {
    const png = await renderImageToPng(
      opts.input.image,
      mmToPx(preset.totalWidthMm, dpi),
      mmToPx(h, dpi),
      fit,
      fitBackground,
    );
    return [{ xMm: 0, widthMm: preset.totalWidthMm, png }];
  }

  const three = opts.input;
  const [backPng, frontPng] = await Promise.all([
    renderImageToPng(three.back, mmToPx(sideW, dpi), mmToPx(h, dpi), fit, fitBackground),
    renderImageToPng(three.front, mmToPx(sideW, dpi), mmToPx(h, dpi), fit, fitBackground),
  ]);

  let spineSection: Section;
  if (three.spineImage) {
    const spinePng = await renderImageToPng(
      three.spineImage,
      mmToPx(spineW, dpi),
      mmToPx(h, dpi),
      fit,
      fitBackground,
    );
    spineSection = { xMm: sideW, widthMm: spineW, png: spinePng };
  } else if (three.spinePreset) {
    const spinePng = await rasterizeSpineSvg({
      spine: three.spinePreset,
      widthPx: mmToPx(spineW, dpi),
      heightPx: mmToPx(h, dpi),
    });
    spineSection = { xMm: sideW, widthMm: spineW, png: spinePng };
  } else {
    throw new Error("Three-image mode requires either a spine image or a spine preset.");
  }

  return [
    { xMm: 0, widthMm: sideW, png: backPng },
    spineSection,
    { xMm: sideW + spineW, widthMm: sideW, png: frontPng },
  ];
}
