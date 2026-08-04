import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";

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
    <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white pl-1 pr-2 py-1 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-200">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        className="block min-w-0 flex-1 text-sm text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 focus:outline-none"
      />
      {file && (
        <button
          type="button"
          onClick={() => onFile(null)}
          aria-label="Clear file"
          title="Clear"
          className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}
