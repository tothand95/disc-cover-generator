import { Component, ChangeDetectionStrategy, ElementRef, effect, input, output, viewChild } from '@angular/core';
import { Icon } from '../../shared/icon/icon';

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
      const el = this.inputRef().nativeElement;
      const file = this.file();
      if (file) {
        if (el.files && el.files.length === 1 && el.files[0] === file) return;
        try {
          const dt = new DataTransfer();
          dt.items.add(file);
          el.files = dt.files;
        } catch {
          // Older browsers may block; ignore.
        }
      } else if (el.value) {
        el.value = '';
      }
    });
  }

  onChange(e: Event): void {
    const el = e.target as HTMLInputElement;
    this.fileChange.emit(el.files?.[0] ?? null);
  }

  clear(): void {
    this.fileChange.emit(null);
  }
}
