import { useState } from "react";

export function DropOverlay({
  globalDragging,
  label,
  onSelectFile,
}: {
  globalDragging?: boolean;
  label: string;
  onSelectFile: (file: File) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  if (!globalDragging) return null;
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = Array.from(e.dataTransfer.files).find((f) =>
          f.type.startsWith("image/"),
        );
        if (file) onSelectFile(file);
      }}
      className={`absolute inset-0 flex items-center justify-center text-white text-center font-semibold select-none transition-colors ${
        isDragging ? "bg-indigo-600/85" : "bg-indigo-500/70"
      }`}
      style={{
        margin: "2px",
        border: "3px dashed white",
        borderRadius: "1.5rem",
        zIndex: 50,
        fontSize: "0.85rem",
        padding: "0.25rem",
      }}
    >
      {isDragging ? `Release for ${label}` : `Drop for ${label}`}
    </div>
  );
}
