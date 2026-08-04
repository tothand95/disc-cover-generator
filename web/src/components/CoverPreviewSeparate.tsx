import { useObjectUrl } from "../hooks/useObjectUrl";
import { useCoverStage } from "../hooks/useCoverStage";
import { SectionImage } from "./SectionImage";
import { SpinePresetPreview } from "./SpinePresetPreview";
import { DropOverlay } from "../ui/DropOverlay";
import { getSpinePresetImageUrl, getSpinePresetImageAspectRatio, type SpinePresetImageKey } from "../spine/assets";
import type { BorderMode, CasePreset, Fit, SpinePreset, SpineTextAlign } from "../types";

interface Props {
  preset: CasePreset;
  fit: Fit;
  borderMode: BorderMode;
  borderThicknessPx: number;
  borderColor: string;
  fitBackground: string;
  dpi: number;

  backImage: File | null;
  frontImage: File | null;
  spineImage: File | null;
  spinePreset: SpinePreset;
  spineTitle: string;
  spineBg: string;
  spineTextColor: string;
  spineTextAlign: SpineTextAlign;
  showFrontPresetImage: boolean;
  frontImageWidening: number;

  onSelectBack?: (file: File | null) => void;
  onSelectFront?: (file: File | null) => void;
  onSelectSpine?: (file: File | null) => void;
  isDraggingFile?: boolean;
}

const MM_PER_INCH = 25.4;

export function CoverPreviewSeparate(props: Props) {
  const {
    preset,
    fit,
    borderMode,
    borderThicknessPx,
    borderColor,
    fitBackground,
    dpi,
    backImage,
    frontImage,
    spineImage,
    spinePreset,
    spineTitle,
    spineBg,
    spineTextColor,
    spineTextAlign,
    showFrontPresetImage,
    frontImageWidening,
    onSelectBack,
    onSelectFront,
    onSelectSpine,
    isDraggingFile,
  } = props;

  const { wrapRef, labelsRef, stageWidth, stageHeight, mmToPx, padding } =
    useCoverStage(preset);
  const backUrl = useObjectUrl(backImage);
  const frontUrl = useObjectUrl(frontImage);
  const spineUrl = useObjectUrl(spineImage);

  const borderMm = (borderThicknessPx / dpi) * MM_PER_INCH;
  const borderPreviewPx =
    borderMode === "none" || borderThicknessPx <= 0
      ? 0
      : Math.max(1, borderMm * mmToPx);
  const spineWidthPx = preset.spineWidthMm * mmToPx;
  const sideWidthPx = ((preset.totalWidthMm - preset.spineWidthMm) / 2) * mmToPx;
  const sideWidthMm = (preset.totalWidthMm - preset.spineWidthMm) / 2;
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
        className="mb-5"
        style={{ width: stageWidth > 0 ? stageWidth : "100%" }}
      >
        <div className="grid grid-cols-3 text-xs font-medium text-slate-600 whitespace-nowrap">
          <div className="text-left">
            Back · {sideWidthMm.toFixed(1)} × {preset.heightMm} mm
          </div>
          <div className="text-center">Spine · {preset.spineWidthMm} mm</div>
          <div className="text-right">
            Front · {sideWidthMm.toFixed(1)} × {preset.heightMm} mm
          </div>
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
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `${sideWidthMm}fr ${preset.spineWidthMm}fr ${sideWidthMm}fr`,
            gridTemplateRows: "100%",
          }}
        >
          <div style={{ height: "100%", position: "relative" }}>
            <SectionImage
              url={backUrl}
              fit={fit}
              placeholder="back cover"
              onChange={onSelectBack}
            />
            {onSelectBack && (
              <DropOverlay
                globalDragging={isDraggingFile}
                label="back cover"
                onSelectFile={onSelectBack}
              />
            )}
          </div>
          <div style={{ height: "100%", position: "relative" }} className="hover:z-10">
            {spineUrl ? (
              <SectionImage
                url={spineUrl}
                fit={fit}
                placeholder="spine image"
                onChange={onSelectSpine}
              />
            ) : (
              <SpinePresetPreview
                preset={spinePreset}
                title={spineTitle}
                widthPx={spineWidthPx}
                heightPx={stageHeight}
                bg={spineBg}
                textColor={spineTextColor}
                textAlign={spineTextAlign}
              />
            )}
            {onSelectSpine && (
              <DropOverlay
                globalDragging={isDraggingFile}
                label="spine"
                onSelectFile={onSelectSpine}
              />
            )}
          </div>
          <div style={{ height: "100%", position: "relative" }}>
            <SectionImage
              url={frontUrl}
              fit={fit}
              placeholder="front cover"
              onChange={onSelectFront}
            />
            {showFrontPresetImage &&
              (spinePreset === "ps2" || spinePreset === "xbox") &&
              (() => {
                const key = spinePreset as SpinePresetImageKey;
                const url = getSpinePresetImageUrl(key, "front");
                const ar = getSpinePresetImageAspectRatio(key, "front");
                const previewWideningPx =
                  frontImageWidening > 0
                    ? (frontImageWidening * sideWidthPx) /
                      ((sideWidthMm * dpi) / MM_PER_INCH)
                    : 0;
                const imgHeightPx = sideWidthPx / ar;
                const totalHeightPx = imgHeightPx + previewWideningPx * 2;
                return (
                  <div
                    className="pointer-events-none absolute left-0 top-0 w-full select-none"
                    style={{
                      height: totalHeightPx,
                      background: previewWideningPx > 0 ? "#000000" : "transparent",
                    }}
                  >
                    <img
                      src={url}
                      alt=""
                      draggable={false}
                      className="pointer-events-none absolute left-0 w-full select-none"
                      style={{
                        top: previewWideningPx,
                        height: imgHeightPx,
                      }}
                    />
                  </div>
                );
              })()}
            {onSelectFront && (
              <DropOverlay
                globalDragging={isDraggingFile}
                label="front cover"
                onSelectFile={onSelectFront}
              />
            )}
          </div>
        </div>

        {borderMode === "sections" && borderPreviewPx > 0 && (
          <>
            <div
              className="absolute top-0 bottom-0"
              style={{
                left: sideWidthPx,
                width: borderPreviewPx,
                transform: `translateX(-${borderPreviewPx / 2}px)`,
                background: borderColor,
              }}
            />
            <div
              className="absolute top-0 bottom-0"
              style={{
                left: sideWidthPx + spineWidthPx,
                width: borderPreviewPx,
                transform: `translateX(-${borderPreviewPx / 2}px)`,
                background: borderColor,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
