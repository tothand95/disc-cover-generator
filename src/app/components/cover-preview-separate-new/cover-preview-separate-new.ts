import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { CasePreset } from '@core/types';

/**
 * Experimental separate preview: pure CSS grid + aspect-ratio.
 * No JS-computed stage size, no mm→px math for the grid itself.
 * The stage sizes itself via `aspect-ratio` inside a flex parent, and
 * the three columns are `fr` shares of the total cover width.
 */
@Component({
  selector: 'app-cover-preview-separate-new',
  standalone: true,
  templateUrl: './cover-preview-separate-new.html',
  styleUrl: './cover-preview-separate-new.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoverPreviewSeparateNew {
  readonly preset = input.required<CasePreset>();

  protected readonly aspect = computed(() => {
    const p = this.preset();
    return `${p.totalWidthMm} / ${p.heightMm}`;
  });

  protected readonly gridCols = computed(() => {
    const p = this.preset();
    const side = (p.totalWidthMm - p.spineWidthMm) / 2;
    return `${side}fr ${p.spineWidthMm}fr ${side}fr`;
  });

  protected readonly sideMm = computed(() => (this.preset().totalWidthMm - this.preset().spineWidthMm) / 2);
}
