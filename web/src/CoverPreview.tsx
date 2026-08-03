import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { buildSpineSvg, type SpineTextAlign as SpineTextAlignShared } from "../../core/spine/svg";
import { resolveSpineSvgOptions } from "./lib/spineOptions";
import type { SpinePresetInput } from "../../core/types";

interface CasePreset {
  id: string;
  label: string;
  totalWidthMm: number;
  heightMm: number;
  spineWidthMm: number;
}

type Fit = "stretch" | "fill" | "fit";
type BorderMode = "none" | "outer" | "sections";
type SpinePreset = "ps2" | "ps1" | "xbox" | "xbox360" | "blank" | "text";
type SpineTextAlign = SpineTextAlignShared;

interface CoverPreviewProps {
  preset: CasePreset;
  kind: "single" | "three";
  fit: Fit;
  borderMode: BorderMode;
  borderThicknessPx: number;
  borderColor: string;
  fitBackground: string;
  dpi: number;

  singleImage: File | null;
  backImage: File | null;
  frontImage: File | null;
  spineImage: File | null;
  spinePreset: SpinePreset;
  spineTitle: string;
  spineBg: string;
  spineTextColor: string;
  spineTextAlign: SpineTextAlign;
}

const MM_PER_INCH = 25.4;

function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

function useContainerSize(ref: React.RefObject<HTMLElement>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

function fitToObjectFit(fit: Fit): React.CSSProperties["objectFit"] {
  return fit === "stretch" ? "fill" : fit === "fill" ? "cover" : "contain";
}

function SectionImage({
  url,
  fit,
  placeholder,
}: {
  url: string | null;
  fit: Fit;
  placeholder: string;
}) {
  if (!url) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs bg-slate-100 select-none">
        {placeholder}
      </div>
    );
  }
  return (
    <img
      src={url}
      alt=""
      draggable={false}
      style={{ width: "100%", height: "100%", objectFit: fitToObjectFit(fit), display: "block" }}
    />
  );
}

function SharedSpineSvg({
  spine,
  widthPx,
  heightPx,
}: {
  spine: SpinePresetInput;
  widthPx: number;
  heightPx: number;
}) {
  const [svg, setSvg] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    if (widthPx <= 0 || heightPx <= 0) {
      setSvg("");
      return;
    }
    resolveSpineSvgOptions(spine, widthPx, heightPx)
      .then((opts) => {
        if (!cancelled) setSvg(buildSpineSvg(opts));
      })
      .catch(() => {
        if (!cancelled) setSvg("");
      });
    return () => {
      cancelled = true;
    };
  }, [spine.preset, spine.title, spine.extras?.backgroundColor, spine.extras?.textColor, spine.extras?.textAlign, widthPx, heightPx]);

  if (!svg) return null;
  return (
    <div
      className="w-full h-full overflow-hidden select-none"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function SpinePresetPreview({
  preset,
  title,
  widthPx,
  heightPx,
  bg,
  textColor,
  textAlign,
}: {
  preset: SpinePreset;
  title: string;
  widthPx: number;
  heightPx: number;
  bg: string;
  textColor: string;
  textAlign: SpineTextAlign;
}) {
  if (preset === "blank") return <div className="w-full h-full" style={{ background: bg }} />;
  if (preset === "ps2" || preset === "text") {
    const spine: SpinePresetInput = {
      preset,
      title,
      extras: { backgroundColor: bg, textColor, textAlign },
    };
    return <SharedSpineSvg spine={spine} widthPx={widthPx} heightPx={heightPx} />;
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500 text-[10px] px-1 text-center select-none">
      {preset.toUpperCase()} preset<br />coming soon
    </div>
  );
}

export function CoverPreview(props: CoverPreviewProps) {
  const {
    preset,
    kind,
    fit,
    borderMode,
    borderThicknessPx,
    borderColor,
    fitBackground,
    dpi,
    singleImage,
    backImage,
    frontImage,
    spineImage,
    spinePreset,
    spineTitle,
    spineBg,
    spineTextColor,
    spineTextAlign,
  } = props;

  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const wrapSize = useContainerSize(wrapRef);
  const labelsSize = useContainerSize(labelsRef);

  const singleUrl = useObjectUrl(singleImage);
  const backUrl = useObjectUrl(backImage);
  const frontUrl = useObjectUrl(frontImage);
  const spineUrl = useObjectUrl(spineImage);

  const borderMm = (borderThicknessPx / dpi) * MM_PER_INCH;
  const padding = 16;
  const labelsGap = 8;

  // Compute the largest cover size that fits BOTH the available width and
  // height (like object-fit: contain), preserving the preset's aspect ratio.
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
  const borderPreviewPx =
    borderMode === "none" || borderThicknessPx <= 0
      ? 0
      : Math.max(1, borderMm * mmToPx);
  const heightPx = stageHeight;
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
      {/* Size labels ABOVE the cover, matched to the computed stage width */}
      <div
        ref={labelsRef}
        className="mb-2"
        style={{ width: stageWidth > 0 ? stageWidth : "100%" }}
      >
        {kind === "single" ? (
          <div className="text-center text-xs font-medium text-slate-600">
            {preset.totalWidthMm} × {preset.heightMm} mm
          </div>
        ) : (
          <div className="grid grid-cols-3 text-xs font-medium text-slate-600 whitespace-nowrap">
            <div className="text-left">
              Back · {sideWidthMm.toFixed(1)} × {preset.heightMm} mm
            </div>
            <div className="text-center">
              Spine · {preset.spineWidthMm} mm
            </div>
            <div className="text-right">
              Front · {sideWidthMm.toFixed(1)} × {preset.heightMm} mm
            </div>
          </div>
        )}
      </div>

      <div
        ref={stageRef}
        className="relative"
        style={{
          width: stageWidth,
          height: stageHeight,
          boxShadow: outerShadow,
          background: fit === "fit" ? fitBackground : "white",
        }}
      >
        {kind === "single" ? (
          <div className="absolute inset-0">
            <SectionImage url={singleUrl} fit={fit} placeholder="Single image" />
          </div>
        ) : (
          <div className="absolute inset-0 flex">
            <div style={{ width: sideWidthPx, height: "100%", position: "relative" }}>
              <SectionImage url={backUrl} fit={fit} placeholder="Back" />
            </div>
            <div style={{ width: spineWidthPx, height: "100%", position: "relative" }}>
              {spineUrl ? (
                <SectionImage url={spineUrl} fit={fit} placeholder="Spine" />
              ) : (
                <SpinePresetPreview
                  preset={spinePreset}
                  title={spineTitle}
                  widthPx={spineWidthPx}
                  heightPx={heightPx}
                  bg={spineBg}
                  textColor={spineTextColor}
                  textAlign={spineTextAlign}
                />
              )}
            </div>
            <div style={{ width: sideWidthPx, height: "100%", position: "relative" }}>
              <SectionImage url={frontUrl} fit={fit} placeholder="Front" />
            </div>
          </div>
        )}

        {kind === "three" && borderMode !== "none" && (
          <>
            {borderMode === "sections" && borderPreviewPx > 0 ? (
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
            ) : (
              // Preview guide only (not rendered in the PDF): lighter dashed
              // lines showing where the section boundaries are.
              <>
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{
                    left: sideWidthPx,
                    borderLeft: "1px dashed rgba(148, 163, 184, 0.8)",
                    transform: "translateX(-0.5px)",
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{
                    left: sideWidthPx + spineWidthPx,
                    borderLeft: "1px dashed rgba(148, 163, 184, 0.8)",
                    transform: "translateX(-0.5px)",
                  }}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

