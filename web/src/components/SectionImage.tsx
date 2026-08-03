import type { Fit } from "../types";

function fitToObjectFit(fit: Fit): React.CSSProperties["objectFit"] {
  return fit === "stretch" ? "fill" : fit === "fill" ? "cover" : "contain";
}

export function SectionImage({
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
      <div className="w-full h-full flex items-center justify-center text-slate-500 text-lg font-medium select-none bg-slate-100">
        {placeholder}
      </div>
    );
  }
  return (
    <img
      src={url}
      alt=""
      draggable={false}
      style={{
        width: "100%",
        height: "100%",
        objectFit: fitToObjectFit(fit),
        display: "block",
      }}
    />
  );
}
