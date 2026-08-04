import { useRef } from "react";
import { ImagePlus, Pencil, Trash2 } from "lucide-react";
import type { Fit } from "../types";

function fitToObjectFit(fit: Fit): React.CSSProperties["objectFit"] {
  return fit === "stretch" ? "fill" : fit === "fill" ? "cover" : "contain";
}

export function SectionImage({
  url,
  fit,
  placeholder,
  onChange,
}: {
  url: string | null;
  fit: Fit;
  placeholder: string;
  onChange?: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => inputRef.current?.click();
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onChange) onChange(file);
    e.target.value = "";
  };

  const hiddenInput = onChange ? (
    <input
      ref={inputRef}
      type="file"
      accept="image/png,image/jpeg,image/webp"
      className="hidden"
      onChange={onFileChange}
    />
  ) : null;

  if (!url) {
    return (
      <button
        type="button"
        onClick={onChange ? openPicker : undefined}
        disabled={!onChange}
        className={`group w-full h-full flex flex-col items-center justify-center gap-2 text-slate-500 text-base font-medium select-none bg-slate-100 ${
          onChange ? "hover:bg-slate-200 hover:text-slate-700 transition" : "cursor-default"
        }`}
      >
        <ImagePlus className="h-6 w-6" strokeWidth={1.75} />
        <span className="px-2 text-center">
          {onChange ? `Click or drop to add ${placeholder}` : placeholder}
        </span>
        {hiddenInput}
      </button>
    );
  }

  return (
    <div className="group relative w-full h-full">
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
      {onChange && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/40 opacity-0 group-hover:opacity-100 transition">
          <button
            type="button"
            onClick={openPicker}
            aria-label={`Replace ${placeholder}`}
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow hover:bg-slate-100 transition"
          >
            <Pencil className="h-4 w-4" strokeWidth={1.75} />
            <span>Replace</span>
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={`Clear ${placeholder}`}
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-red-600 shadow hover:bg-red-50 transition"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
            <span>Clear</span>
          </button>
        </div>
      )}
      {hiddenInput}
    </div>
  );
}
