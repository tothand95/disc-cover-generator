import { useEffect, useState } from "react";

/**
 * Tracks whether the user is currently dragging one or more files anywhere
 * on the page. Uses document-level `dragover` (continuously fires while
 * dragging) and `drop` (resets). Simple and reliable — do not add per-zone
 * `stopPropagation()` in local drop handlers or this will get stuck.
 */
export function useGlobalFileDrag(): boolean {
  const [isDragging, setIsDragging] = useState(false);
  useEffect(() => {
    const hasFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setIsDragging(true);
    };
    const onDrop = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
      setIsDragging(false);
    };
    document.addEventListener("dragover", onOver);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragover", onOver);
      document.removeEventListener("drop", onDrop);
    };
  }, []);
  return isDragging;
}
