// All dimensions are in millimetres unless otherwise noted.

export type CasePresetId =
  | "dvd-normal"
  | "dvd-slim"
  | "bluray"
  | "cd-jewel"
  | "cd-jewel-folded";

export interface CasePreset {
  id: CasePresetId;
  label: string;
  totalWidthMm: number;
  heightMm: number;
  spineWidthMm: number;
  frontFoldMm?: number;
  defaultBleedMm: number;
}

export type FitMode = "stretch" | "fill" | "fit";

export type BorderMode = "none" | "outer" | "sections";

export interface BorderOptions {
  mode: BorderMode;
  /** Line thickness in pixels (converted to mm using the render DPI). */
  thicknessPx: number;
  color: string;
}

export type SpinePresetId = "ps2" | "xbox" | "xbox360" | "blank" | "text";

export type SpineTextAlign = "start" | "center" | "end";

export interface SpinePresetInput {
  preset: SpinePresetId;
  title: string;
  extras?: {
    backgroundColor?: string;
    textColor?: string;
    textAlign?: SpineTextAlign;
    /** When true and the preset has a front image, overlay it on top of the front cover. */
    showFrontImage?: boolean;
  };
}

export interface SingleImageInput {
  kind: "single";
  imagePath: string;
  fit: FitMode;
}

export interface ThreePartInput {
  kind: "three";
  backImagePath: string;
  frontImagePath: string;
  spineImagePath?: string;
  spinePreset?: SpinePresetInput;
  fit: FitMode;
}

export type CoverInput = SingleImageInput | ThreePartInput;

export interface GenerateOptions {
  preset: CasePresetId;
  input: CoverInput;
  border: BorderOptions;
  outputPath: string;
  bleedMm?: number;
  dpi?: number;
  /** Background color for empty area when fit = "fit" (contain). Hex, e.g. "#000000". */
  fitBackground?: string;
}
