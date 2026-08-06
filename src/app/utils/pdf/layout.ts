export const MM_PER_INCH = 25.4;
export const PT_PER_INCH = 72;
export const MM_TO_PT = PT_PER_INCH / MM_PER_INCH;
export const A4_WIDTH_MM = 297;
export const A4_HEIGHT_MM = 210;

export const mmToPt = (mm: number) => mm * MM_TO_PT;
export const mmToPx = (mm: number, dpi: number) => Math.round((mm / MM_PER_INCH) * dpi);
export const pxToMm = (px: number, dpi: number) => (px / dpi) * MM_PER_INCH;
