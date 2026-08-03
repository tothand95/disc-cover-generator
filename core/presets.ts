import type { CasePreset, CasePresetId } from "./types.js";

export const CASE_PRESETS: Record<CasePresetId, CasePreset> = {
  "dvd-normal": {
    id: "dvd-normal",
    label: "DVD Normal case",
    totalWidthMm: 273,
    heightMm: 183,
    spineWidthMm: 14,
    defaultBleedMm: 3,
  },
  "dvd-slim": {
    id: "dvd-slim",
    label: "DVD Slim case",
    totalWidthMm: 266,
    heightMm: 183,
    spineWidthMm: 7,
    defaultBleedMm: 3,
  },
  bluray: {
    id: "bluray",
    label: "Blu-Ray case",
    totalWidthMm: 271,
    heightMm: 172,
    spineWidthMm: 11,
    defaultBleedMm: 3,
  },
  "cd-jewel": {
    id: "cd-jewel",
    label: "CD Jewel case",
    totalWidthMm: 271,
    heightMm: 120,
    spineWidthMm: 7,
    defaultBleedMm: 3,
  },
  "cd-jewel-folded": {
    id: "cd-jewel-folded",
    label: "CD Jewel case (folded front)",
    totalWidthMm: 271,
    heightMm: 120,
    spineWidthMm: 7,
    frontFoldMm: 6,
    defaultBleedMm: 3,
  },
};

export function getPreset(id: CasePresetId): CasePreset {
  const p = CASE_PRESETS[id];
  if (!p) throw new Error(`Unknown case preset: ${id}`);
  return p;
}

export function listPresets(): CasePreset[] {
  return Object.values(CASE_PRESETS);
}
