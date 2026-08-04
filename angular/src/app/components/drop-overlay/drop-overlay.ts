import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
} from '@angular/core';

/**
 * Full-cover drop target that appears whenever the app-level drag state is
 * true. Emits `fileSelected` with the first image dropped. Do NOT call
 * stopPropagation() in the drop handler or the global drag state will get
 * stuck — bubbling to the document listener is required to reset it.
 */
@Component({
  selector: 'app-drop-overlay',
  standalone: true,
  templateUrl: './drop-overlay.html',
  styleUrl: './drop-overlay.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropOverlay {
  readonly visible = input<boolean>(false);
  readonly label = input<string>('');
  readonly fileSelected = output<File>();

  protected readonly isDragging = signal(false);

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }

  onDragEnter(): void {
    this.isDragging.set(true);
  }

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(false);
    const file = Array.from(e.dataTransfer?.files ?? []).find((f) =>
      f.type.startsWith('image/'),
    );
    if (file) this.fileSelected.emit(file);
  }
}
