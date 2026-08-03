import { useObjectUrl } from "../hooks/useObjectUrl";
import { useCoverStage } from "../hooks/useCoverStage";
import { SectionImage } from "./SectionImage";
import { DropOverlay } from "../ui/DropOverlay";
import type { CasePreset, Fit } from "../types";

interface Props {
  preset: CasePreset;
  fit: Fit;
  borderMode: "none" | "outer" | "sections";
  borderThicknessPx: number;
  borderColor: string;
  fitBackground: string;
  dpi: number;
  singleImage: File | null;
  onSelectSingle?: (file: File) => void;
  isDraggingFile?: boolean;
}

const MM_PER_INCH = 25.4;

export function CoverPreviewSingle({
  preset,
  fit,
  borderMode,
  borderThicknessPx,
  borderColor,
  fitBackground,
  dpi,
  singleImage,
  onSelectSingle,
  isDraggingFile,
}: Props) {
  const { wrapRef, labelsRef, stageWidth, stageHeight, mmToPx, padding } =
    useCoverStage(preset);
  const singleUrl = useObjectUrl(singleImage);

  const borderMm = (borderThicknessPx / dpi) * MM_PER_INCH;
  const borderPreviewPx =
    borderMode === "none" || borderThicknessPx <= 0
      ? 0
      : Math.max(1, borderMm * mmToPx);
  const outerShadow =
    borderMode !== "none" && borderPreviewPx > 0 && borderColor
      ? `0 0 0 ${borderPreviewPx}px ${borderColor}`
      : "none";

  return (
    <div
      ref={wrapRef}
      className="w-full h-full flex flex-col items-center justify-center min-h-0 min-w-0"
      style={{ padding: `${padding}px` }}
    >
      <div
        ref={labelsRef}
        className="mb-2"
        style={{ width: stageWidth > 0 ? stageWidth : "100%" }}
      >
        <div className="text-center text-xs font-medium text-slate-600">
          {preset.totalWidthMm} × {preset.heightMm} mm
        </div>
      </div>

      <div
        className="relative"
        style={{
          width: stageWidth,
          height: stageHeight,
          boxShadow: outerShadow,
          background: fit === "fit" ? fitBackground : "white",
        }}
      >
        <div className="absolute inset-0">
          <SectionImage url={singleUrl} fit={fit} placeholder="Single image" />
          {onSelectSingle && (
            <DropOverlay
              globalDragging={isDraggingFile}
              label="cover"
              onSelectFile={onSelectSingle}
            />
          )}
        </div>
      </div>
    </div>
  );
}
