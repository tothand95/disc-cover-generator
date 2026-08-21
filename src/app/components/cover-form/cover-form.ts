import { FormsModule } from '@angular/forms';
import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { CoverStore } from '../../services/cover.store';
import { PdfGeneratorService } from '../../services/pdf-generator.service';
import { ToastService } from '../../services/toast.service';
import { FileInput } from '../../shared/file-input/file-input';
import { Segmented, SegmentedOption } from '../../shared/segmented/segmented';
import { CASE_PRESETS } from '@core/presets';
import type { FitMode, BorderMode, SpineTextAlign } from '@core/types';

type CoverKind = 'single' | 'three';

/**
 * Left-column form. Reads/writes state directly through CoverStore signals.
 * Uses native form controls + a custom `<app-segmented>` for segmented picks.
 */
@Component({
  selector: 'app-cover-form',
  standalone: true,
  imports: [FormsModule, FileInput, Segmented],
  templateUrl: './cover-form.html',
  styleUrl: './cover-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoverForm {
  readonly store = inject(CoverStore);
  private readonly pdf = inject(PdfGeneratorService);
  private readonly toasts = inject(ToastService);

  readonly presetOptions = Object.values(CASE_PRESETS).map((p) => ({
    label: `${p.label} (${p.totalWidthMm}×${p.heightMm}mm, spine ${p.spineWidthMm}mm)`,
    value: p.id,
  }));

  readonly kindOptions: readonly SegmentedOption<CoverKind>[] = [
    { label: 'Single image', value: 'single' },
    { label: 'Separate images', value: 'three' },
  ];

  readonly fitOptions: readonly SegmentedOption<FitMode>[] = [
    { label: 'Stretch', value: 'stretch' },
    { label: 'Fill (cover)', value: 'fill' },
    { label: 'Fit (contain)', value: 'fit' },
  ];

  readonly borderOptions: readonly SegmentedOption<BorderMode>[] = [
    { label: 'None', value: 'none' },
    { label: 'Outer', value: 'outer' },
    { label: 'All', value: 'sections' },
  ];

  readonly spinePresetOptions = [
    { label: 'Blank (solid color)', value: 'blank' },
    { label: 'Text only', value: 'text' },
    { label: 'PS2', value: 'ps2' },
    { label: 'Xbox', value: 'xbox' },
    { label: 'Xbox 360 (coming soon)', value: 'xbox360', disabled: true },
  ];

  readonly textAlignOptions: readonly SegmentedOption<SpineTextAlign>[] = [
    { label: 'Top', value: 'start' },
    { label: 'Center', value: 'center' },
    { label: 'Bottom', value: 'end' },
  ];

  readonly toggleOptions: readonly SegmentedOption<boolean>[] = [
    { label: 'Off', value: false },
    { label: 'On', value: true },
  ];

  protected readonly showSpineSection = computed(() => this.store.images.kind() === 'three' && !this.store.images.spineFile());

  protected readonly hasSpineTitle = computed(() => {
    const p = this.store.spine.preset();
    return p === 'ps2' || p === 'xbox' || p === 'text';
  });

  protected readonly hasFrontImageToggle = computed(() => {
    const p = this.store.spine.preset();
    return p === 'ps2' || p === 'xbox';
  });

  protected readonly hasSeparatorToggle = computed(() => this.store.spine.preset() === 'ps2' && this.store.spine.showFrontImage());

  protected readonly hasColorPickers = computed(() => {
    const p = this.store.spine.preset();
    return p === 'blank' || p === 'text';
  });

  protected readonly isTextPreset = computed(() => this.store.spine.preset() === 'text');

  async onSubmit(): Promise<void> {
    const store = this.store;
    try {
      if (store.images.kind() === 'single') {
        if (!store.images.singleFile()) {
          throw new Error('Please choose an image.');
        }
      } else if (!store.images.backFile() || !store.images.frontFile()) {
        throw new Error('Please choose both back and front images.');
      }

      store.ui.busy.set(true);
      await this.pdf.generateAndOpen();
      this.toasts.success('PDF generated — opened in a new tab.');
    } catch (err) {
      this.toasts.error(err instanceof Error ? err.message : String(err));
    } finally {
      store.ui.busy.set(false);
    }
  }
}
