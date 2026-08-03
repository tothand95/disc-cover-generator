import { useEffect, useState } from "react";
import { buildSpineSvg } from "../../../core/spine/svg";
import { resolveSpineSvgOptions } from "../spine/buildOptions";
import type { SpinePresetInput } from "../../../core/types";
import type { SpinePreset, SpineTextAlign } from "../types";

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
  }, [
    spine.preset,
    spine.title,
    spine.extras?.backgroundColor,
    spine.extras?.textColor,
    spine.extras?.textAlign,
    widthPx,
    heightPx,
  ]);

  if (!svg) return null;
  return (
    <div
      className="spine-svg-host w-full h-full overflow-hidden select-none"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function SpinePresetPreview({
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
