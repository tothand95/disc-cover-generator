export interface CasePreset {
  id: string;
  label: string;
  totalWidthMm: number;
  heightMm: number;
  spineWidthMm: number;
}

export type Kind = "single" | "three";
export type Fit = "stretch" | "fill" | "fit";
export type BorderMode = "none" | "outer" | "sections";
export type SpinePreset = "ps2" | "ps1" | "xbox" | "xbox360" | "blank" | "text";
export type { SpineTextAlign } from "../../core/spine/svg";
