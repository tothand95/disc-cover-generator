import { useRef } from "react";
import { useContainerSize } from "./useContainerSize";
import type { CasePreset } from "../types";

/**
 * Compute the largest stage size that fits BOTH the container width and
 * height (like object-fit: contain) while preserving the preset's aspect
 * ratio, accounting for a labels row and padding.
 */
export function useCoverStage(preset: CasePreset) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const wrapSize = useContainerSize(wrapRef);
  const labelsSize = useContainerSize(labelsRef);

  const padding = 16;
  const labelsGap = 32;

  const availableW = Math.max(0, wrapSize.width - padding * 2);
  const availableH = Math.max(
    0,
    wrapSize.height - padding * 2 - labelsSize.height - labelsGap,
  );
  const ratio = preset.totalWidthMm / preset.heightMm;

  let stageWidth = 0;
  let stageHeight = 0;
  if (availableW > 0 && availableH > 0) {
    if (availableW / availableH > ratio) {
      stageHeight = availableH;
      stageWidth = stageHeight * ratio;
    } else {
      stageWidth = availableW;
      stageHeight = stageWidth / ratio;
    }
  }

  const mmToPx = stageWidth / preset.totalWidthMm || 0;

  return { wrapRef, labelsRef, stageWidth, stageHeight, mmToPx, padding };
}
