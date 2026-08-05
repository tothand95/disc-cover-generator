import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/**
 * Global signal that tracks whether the user is currently dragging one or
 * more files anywhere on the page. Uses document-level dragover (keeps
 * firing while dragging) and drop (resets). Do NOT stopPropagation() in
 * per-zone drop handlers or this signal gets stuck.
 */
@Injectable({ providedIn: 'root' })
export class DragDropService {
  private readonly destroyRef = inject(DestroyRef);
  readonly isDraggingFile = signal(false);

  constructor() {
    const hasFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes('Files');
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      this.isDraggingFile.set(true);
    };
    const onDrop = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
      this.isDraggingFile.set(false);
    };
    document.addEventListener('dragover', onOver);
    document.addEventListener('drop', onDrop);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('dragover', onOver);
      document.removeEventListener('drop', onDrop);
    });
  }
}
