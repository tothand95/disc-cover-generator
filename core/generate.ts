import { promises as fs } from "node:fs";
import { PDFDocument, rgb, LineCapStyle } from "pdf-lib";
import { getPreset } from "./presets.js";
import { renderImageToSize } from "./image.js";
import { renderSpinePreset } from "./spine/index.js";
import type {
  BorderOptions,
  CasePreset,
  GenerateOptions,
  ThreePartInput,
} from "./types.js";

const MM_PER_INCH = 25.4;
const PT_PER_INCH = 72;
const MM_TO_PT = PT_PER_INCH / MM_PER_INCH;

// A4 landscape: 297mm x 210mm. Every cover wrap in our presets fits with bleed.
const A4_WIDTH_MM = 297;
const A4_HEIGHT_MM = 210;

function mmToPt(mm: number): number {
  return mm * MM_TO_PT;
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace(/^#/, "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (full.length !== 6) throw new Error(`Invalid color: ${hex}`);
  return {
    r: parseInt(full.slice(0, 2), 16) / 255,
    g: parseInt(full.slice(2, 4), 16) / 255,
    b: parseInt(full.slice(4, 6), 16) / 255,
  };
}

interface Section {
  xMm: number;
  widthMm: number;
  png: Buffer;
}

async function buildSections(
  preset: CasePreset,
  opts: GenerateOptions,
): Promise<Section[]> {
  const dpi = opts.dpi ?? 300;
  const h = preset.heightMm;
  const spineW = preset.spineWidthMm;
  const backW = (preset.totalWidthMm - spineW) / 2;
  const frontW = backW;

  if (opts.input.kind === "single") {
    const png = await renderImageToSize(
      opts.input.imagePath,
      preset.totalWidthMm,
      h,
      opts.input.fit,
      dpi,
      opts.fitBackground,
    );
    return [{ xMm: 0, widthMm: preset.totalWidthMm, png }];
  }

  const three = opts.input as ThreePartInput;

  const [backPng, frontPng] = await Promise.all([
    renderImageToSize(three.backImagePath, backW, h, three.fit, dpi, opts.fitBackground),
    renderImageToSize(three.frontImagePath, frontW, h, three.fit, dpi, opts.fitBackground),
  ]);

  let spinePng: Buffer;
  if (three.spineImagePath) {
    spinePng = await renderImageToSize(
      three.spineImagePath,
      spineW,
      h,
      three.fit,
      dpi,
      opts.fitBackground,
    );
  } else if (three.spinePreset) {
    const rendered = await renderSpinePreset(three.spinePreset, spineW, h, dpi);
    spinePng = rendered.png;
  } else {
    throw new Error(
      "Three-image mode requires either a spine image or a spinePreset.",
    );
  }

  return [
    { xMm: 0, widthMm: backW, png: backPng },
    { xMm: backW, widthMm: spineW, png: spinePng },
    { xMm: backW + spineW, widthMm: frontW, png: frontPng },
  ];
}

function drawBorders(
  page: import("pdf-lib").PDFPage,
  sections: Section[],
  preset: CasePreset,
  wrapOriginXmm: number,
  wrapOriginYmm: number,
  border: BorderOptions,
  dpi: number,
): void {
  if (border.mode === "none" || border.thicknessPx <= 0) return;

  const color = parseHexColor(border.color);
  const strokeColor = rgb(color.r, color.g, color.b);
  const thicknessMm = (border.thicknessPx / dpi) * MM_PER_INCH;
  const thicknessPt = mmToPt(thicknessMm);
  const wrapW = preset.totalWidthMm;
  const wrapH = preset.heightMm;

  // pdf-lib strokes are centered on the path. To place the outer border fully
  // OUTSIDE the cover, grow the rectangle by half the border thickness on each
  // side. This keeps the cover's visible area at the preset dimensions.
  const half = thicknessMm / 2;
  page.drawRectangle({
    x: mmToPt(wrapOriginXmm - half),
    y: mmToPt(wrapOriginYmm - half),
    width: mmToPt(wrapW + thicknessMm),
    height: mmToPt(wrapH + thicknessMm),
    borderColor: strokeColor,
    borderWidth: thicknessPt,
  });

  if (border.mode === "sections" && sections.length > 1) {
    // Section dividers are drawn centered on the boundary — a 2px line takes
    // 1px from each adjacent section, which is the "equal distribution" we want.
    for (let i = 1; i < sections.length; i++) {
      const xMm = wrapOriginXmm + sections[i]!.xMm;
      page.drawLine({
        start: { x: mmToPt(xMm), y: mmToPt(wrapOriginYmm) },
        end: { x: mmToPt(xMm), y: mmToPt(wrapOriginYmm + wrapH) },
        color: strokeColor,
        thickness: thicknessPt,
      });
    }
  }
}

function drawCropMarks(
  page: import("pdf-lib").PDFPage,
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

  const grey = rgb(0.55, 0.55, 0.55);
  const thickness = 0.5;
  // Round caps + tight spacing renders the dashArray segments as dots.
  const dashArray = [0.01, 2];

  const line = (
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) =>
    page.drawLine({
      start: a,
      end: b,
      color: grey,
      thickness,
      dashArray,
      lineCap: LineCapStyle.Round,
    });

  // Cover corner marks: each cover edge extended outward on both ends, aligned
  // with the picture edge, stopping 1cm out.
  // Bottom edge
  line({ x: x0 - len, y: y0 }, { x: x0, y: y0 });
  line({ x: x1, y: y0 }, { x: x1 + len, y: y0 });
  // Top edge
  line({ x: x0 - len, y: y1 }, { x: x0, y: y1 });
  line({ x: x1, y: y1 }, { x: x1 + len, y: y1 });
  // Left edge
  line({ x: x0, y: y0 - len }, { x: x0, y: y0 });
  line({ x: x0, y: y1 }, { x: x0, y: y1 + len });
  // Right edge
  line({ x: x1, y: y0 - len }, { x: x1, y: y0 });
  line({ x: x1, y: y1 }, { x: x1, y: y1 + len });

  // Spine fold marks — help fold the cover along the two spine boundaries.
  const sideWmm = (preset.totalWidthMm - preset.spineWidthMm) / 2;
  const spineLeftMm = wrapOriginXmm + sideWmm;
  const spineRightMm = wrapOriginXmm + sideWmm + preset.spineWidthMm;
  const spineLeft = mmToPt(spineLeftMm);
  const spineRight = mmToPt(spineRightMm);
  line({ x: spineLeft, y: y0 - len }, { x: spineLeft, y: y0 });
  line({ x: spineLeft, y: y1 }, { x: spineLeft, y: y1 + len });
  line({ x: spineRight, y: y0 - len }, { x: spineRight, y: y0 });
  line({ x: spineRight, y: y1 }, { x: spineRight, y: y1 + len });
}

export async function generateCoverPdf(opts: GenerateOptions): Promise<string> {
  const preset = getPreset(opts.preset);
  const dpi = opts.dpi ?? 300;
  const bleedMm = opts.bleedMm ?? preset.defaultBleedMm;
  const sections = await buildSections(preset, opts);

  const wrapWidthMm = preset.totalWidthMm + bleedMm * 2;
  const wrapHeightMm = preset.heightMm + bleedMm * 2;

  if (wrapWidthMm > A4_WIDTH_MM || wrapHeightMm > A4_HEIGHT_MM) {
    throw new Error(
      `Cover (${wrapWidthMm.toFixed(1)}x${wrapHeightMm.toFixed(1)}mm incl. bleed) does not fit on A4 landscape (${A4_WIDTH_MM}x${A4_HEIGHT_MM}mm).`,
    );
  }

  const offsetXmm = (A4_WIDTH_MM - wrapWidthMm) / 2;
  const offsetYmm = (A4_HEIGHT_MM - wrapHeightMm) / 2;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([mmToPt(A4_WIDTH_MM), mmToPt(A4_HEIGHT_MM)]);

  drawCropMarks(page, offsetXmm + bleedMm, offsetYmm + bleedMm, preset);

  for (const section of sections) {
    const img = await pdf.embedPng(section.png);
    page.drawImage(img, {
      x: mmToPt(offsetXmm + bleedMm + section.xMm),
      y: mmToPt(offsetYmm + bleedMm),
      width: mmToPt(section.widthMm),
      height: mmToPt(preset.heightMm),
    });
  }

  drawBorders(
    page,
    sections,
    preset,
    offsetXmm + bleedMm,
    offsetYmm + bleedMm,
    opts.border,
    dpi,
  );

  const bytes = await pdf.save();
  await fs.writeFile(opts.outputPath, bytes);
  return opts.outputPath;
}
