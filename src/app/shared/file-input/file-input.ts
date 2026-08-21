import { Component, ChangeDetectionStrategy, ElementRef, effect, input, output, viewChild } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Native file picker with a "clear" button. Syncs the native input's file
 * list when the bound File signal changes, so the visible filename stays
 * in sync when a file is dropped elsewhere.
 */
@Component({
  selector: 'app-file-input',
  standalone: true,
  imports: [Icon],
  templateUrl: './file-input.html',
  styleUrl: './file-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileInput {
  readonly file = input<File | null>(null);
  readonly fileChange = output<File | null>();

  protected readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('nativeInput');

  constructor() {
    effect(() => {
      const element = this.inputRef().nativeElement;
      const file = this.file();
      if (file) {
        if (element.files && element.files.length === 1 && element.files[0] === file) {
          return;
        }
        try {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          element.files = dataTransfer.files;
        } catch {
          // Older browsers may block; ignore.
        }
      } else if (element.value) {
        element.value = '';
      }
    });
  }

  onChange(event: Event): void {
    const element = event.target as HTMLInputElement;
    this.fileChange.emit(element.files?.[0] ?? null);
  }

  clear(): void {
    this.fileChange.emit(null);
  }
}
