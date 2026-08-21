import { Component, ChangeDetectionStrategy, input, output, signal, viewChild, ElementRef, computed } from '@angular/core';
import type { FitMode } from '@core/types';
import { Icon } from '../../../shared/icon/icon';

/**
 * A single cover section's image slot. Renders a placeholder button when
 * `url` is null and a hover overlay with Replace/Clear pill buttons when
 * an image is set. Emits `fileChange` with the chosen File or null.
 */
@Component({
  selector: 'app-section-image',
  standalone: true,
  imports: [Icon],
  templateUrl: './section-image.html',
  styleUrl: './section-image.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionImage {
  readonly url = input<string | null>(null);
  readonly fit = input<FitMode>('stretch');
  readonly placeholder = input<string>('image');
  readonly editable = input<boolean>(true);
  readonly fileChange = output<File | null>();

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  protected readonly hovered = signal(false);

  protected readonly objectFit = computed(() => {
    const f = this.fit();
    if (f === 'stretch') {
      return 'fill';
    }
    if (f === 'fill') {
      return 'cover';
    }
    return 'contain';
  });

  openPicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFileChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file) {
      this.fileChange.emit(file);
    }
    input.value = '';
  }

  clear(): void {
    this.fileChange.emit(null);
  }
}
