import { useEffect, useRef } from "react";

export function FileInput({
  file,
  onFile,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    if (file) {
      if (el.files && el.files.length === 1 && el.files[0] === file) return;
      try {
        const dt = new DataTransfer();
        dt.items.add(file);
        el.files = dt.files;
      } catch {
        // Older browsers may block programmatic FileList assignment; ignore.
      }
    } else if (el.value) {
      el.value = "";
    }
  }, [file]);

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        className="block text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
      />
      {file && (
        <button
          type="button"
          onClick={() => onFile(null)}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          clear
        </button>
      )}
    </div>
  );
}
