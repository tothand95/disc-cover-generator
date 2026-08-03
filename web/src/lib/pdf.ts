import { PDFDocument, degrees, rgb, LineCapStyle, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type {
  BorderOptions,
  CasePreset,
  FitMode,
  SpinePresetInput,
} from "../../../core/types";
import { getPreset } from "../../../core/presets";
import { HIND_CAP_HEIGHT_RATIO } from "../../../core/spine/svg";
import { renderImageToPng } from "./image";
import { loadHindSemiBold } from "./fonts";

const MM_PER_INCH = 25.4;
const PT_PER_INCH = 72;
const MM_TO_PT = PT_PER_INCH / MM_PER_INCH;
const A4_WIDTH_MM = 297;
const A4_HEIGHT_MM = 210;

const mmToPt = (mm: number) => mm * MM_TO_PT;
const mmToPx = (mm: number, dpi: number) => Math.round((mm / MM_PER_INCH) * dpi);

function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace(/^#/, "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (full.length !== 6) throw new Error(`Invalid color: ${hex}`);
  return {
    r: parseInt(full.slice(0, 2), 16) / 255,
    g: parseInt(full.slice(2, 4), 16) / 255,
    b: parseInt(full.slice(4, 6), 16) / 255,
  };
}

export type SingleInput = { kind: "single"; image: File };
export type ThreeInput = {
  kind: "three";
  back: File;
  front: File;
  spineImage: File | null;
  spinePreset: SpinePresetInput | null;
};

export interface GenerateBrowserOptions {
  presetId: CasePreset["id"];
  input: SingleInput | ThreeInput;
  fit: FitMode;
  border: BorderOptions;
  fitBackground: string;
  dpi: number;
}

interface Section {
  xMm: number;
  widthMm: number;
  /** Rasterized PNG bytes for image sections, or null when a vector spine is drawn instead. */
  png: Uint8Array | null;
  /** Spine preset input for vector-drawn spine sections. */
  spineVector?: SpinePresetInput;
}

function drawSpineVector(
  page: PDFPage,
  font: PDFFont,
  spine: SpinePresetInput,
  spineXmm: number,
  spineYmm: number,
  spineWmm: number,
  spineHmm: number,
): void {
  const bgColor =
    spine.preset === "ps2"
      ? "#ffffff"
      : spine.extras?.backgroundColor || "#ffffff";
  const textColor =
    spine.preset === "ps2"
      ? "#000000"
      : spine.extras?.textColor || "#000000";
  const align =
    spine.preset === "ps2" ? "center" : spine.extras?.textAlign || "center";

  const bg = parseHex(bgColor);
  page.drawRectangle({
    x: mmToPt(spineXmm),
    y: mmToPt(spineYmm),
    width: mmToPt(spineWmm),
    height: mmToPt(spineHmm),
    color: rgb(bg.r, bg.g, bg.b),
  });

  if (spine.preset === "blank" || !spine.title) return;

  const spineWpt = mmToPt(spineWmm);
  const spineHpt = mmToPt(spineHmm);
  const sx = mmToPt(spineXmm);
  const sy = mmToPt(spineYmm);

  // Match the SVG builder: font size = 55% of the spine's (narrow) dimension.
  const fontSize = Math.max(6, Math.floor(mmToPx(spineWmm, 72) * 0.55));
  const capH = fontSize * HIND_CAP_HEIGHT_RATIO;
  const textW = font.widthOfTextAtSize(spine.title, fontSize);

  // Rotate -90° (clockwise). After rotation around the drawText origin (x, y):
  //   - text extends downward by textW along y-
  //   - cap-height extends rightward by capH along x+
  // Center of the visible glyph box is (x + capH/2, y - textW/2).
  const xCentered = sx + (spineWpt - capH) / 2;
  const padPt = mmToPt(4);

  let yBaseline: number;
  if (align === "start") {
    yBaseline = sy + spineHpt - padPt;
  } else if (align === "end") {
    yBaseline = sy + padPt + textW;
  } else {
    yBaseline = sy + (spineHpt + textW) / 2;
  }

  const tc = parseHex(textColor);
  page.drawText(spine.title, {
    x: xCentered,
    y: yBaseline,
    size: fontSize,
    font,
    color: rgb(tc.r, tc.g, tc.b),
    rotate: degrees(-90),
  });
}

function drawCropMarks(
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
  const grey = rgb(0.55, 0.55, 0.55);
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

function drawBorders(
  page: PDFPage,
  sections: Section[],
  preset: CasePreset,
  wrapOriginXmm: number,
  wrapOriginYmm: number,
  border: BorderOptions,
  dpi: number,
): void {
  if (border.mode === "none" || border.thicknessPx <= 0) return;

  const color = parseHex(border.color);
  const strokeColor = rgb(color.r, color.g, color.b);
  const thicknessMm = (border.thicknessPx / dpi) * MM_PER_INCH;
  const thicknessPt = mmToPt(thicknessMm);
  const half = thicknessMm / 2;
  const wrapW = preset.totalWidthMm;
  const wrapH = preset.heightMm;

  page.drawRectangle({
    x: mmToPt(wrapOriginXmm - half),
    y: mmToPt(wrapOriginYmm - half),
    width: mmToPt(wrapW + thicknessMm),
    height: mmToPt(wrapH + thicknessMm),
    borderColor: strokeColor,
    borderWidth: thicknessPt,
  });

  if (border.mode === "sections" && sections.length > 1) {
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

async function buildSections(
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
    spineSection = {
      xMm: sideW,
      widthMm: spineW,
      png: null,
      spineVector: three.spinePreset,
    };
  } else {
    throw new Error("Three-image mode requires either a spine image or a spine preset.");
  }

  return [
    { xMm: 0, widthMm: sideW, png: backPng },
    spineSection,
    { xMm: sideW + spineW, widthMm: sideW, png: frontPng },
  ];
}

export async function generateCoverPdfInBrowser(
  opts: GenerateBrowserOptions,
): Promise<Uint8Array> {
  const preset = getPreset(opts.presetId);
  const bleedMm = preset.defaultBleedMm;
  const wrapWidthMm = preset.totalWidthMm + bleedMm * 2;
  const wrapHeightMm = preset.heightMm + bleedMm * 2;
  if (wrapWidthMm > A4_WIDTH_MM || wrapHeightMm > A4_HEIGHT_MM) {
    throw new Error(
      `Cover (${wrapWidthMm.toFixed(1)}x${wrapHeightMm.toFixed(1)}mm incl. bleed) does not fit on A4 landscape.`,
    );
  }

  const sections = await buildSections(preset, opts);

  const offsetXmm = (A4_WIDTH_MM - wrapWidthMm) / 2 + bleedMm;
  const offsetYmm = (A4_HEIGHT_MM - wrapHeightMm) / 2 + bleedMm;

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const spineFont = await pdf.embedFont(await loadHindSemiBold(), { subset: true });

  const page = pdf.addPage([mmToPt(A4_WIDTH_MM), mmToPt(A4_HEIGHT_MM)]);

  drawCropMarks(page, offsetXmm, offsetYmm, preset);

  for (const section of sections) {
    if (section.png) {
      const img = await pdf.embedPng(section.png);
      page.drawImage(img, {
        x: mmToPt(offsetXmm + section.xMm),
        y: mmToPt(offsetYmm),
        width: mmToPt(section.widthMm),
        height: mmToPt(preset.heightMm),
      });
    } else if (section.spineVector) {
      drawSpineVector(
        page,
        spineFont,
        section.spineVector,
        offsetXmm + section.xMm,
        offsetYmm,
        section.widthMm,
        preset.heightMm,
      );
    }
  }

  drawBorders(page, sections, preset, offsetXmm, offsetYmm, opts.border, opts.dpi);

  return pdf.save();
}
