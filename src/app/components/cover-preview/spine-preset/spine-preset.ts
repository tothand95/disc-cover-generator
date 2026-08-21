import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { buildSpineSvg } from '@core/spine/svg';
import type { SpinePresetInput } from '@core/types';
import { CoverStore } from '../../../services/cover.store';
import { resolveSpineSvgOptions } from '../../../utils/spine/buildOptions';

/**
 * Renders a spine preset as inline SVG, going through the same
 * buildSpineSvg / resolveSpineSvgOptions pipeline as the PDF rasterizer.
 * The preview is bypassSecurityTrustHtml'd — inputs are trusted because
 * they come from our own SVG builder.
 */
@Component({
  selector: 'app-spine-preset',
  standalone: true,
  imports: [UpperCasePipe],
  templateUrl: './spine-preset.html',
  styleUrl: './spine-preset.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpinePreset {
  readonly widthPx = input.required<number>();
  readonly heightPx = input.required<number>();

  readonly store = inject(CoverStore);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly svg = signal<SafeHtml | null>(null);

  constructor() {
    effect(() => {
      const preset = this.store.spine.preset();
      const w = this.widthPx();
      const h = this.heightPx();
      if (w <= 0 || h <= 0) {
        this.svg.set(null);
        return;
      }
      if (preset === 'blank') {
        this.svg.set(null);
        return;
      }
      const spine: SpinePresetInput = {
        preset,
        title: this.store.spine.title(),
        extras: {
          backgroundColor: this.store.spine.background(),
          textColor: this.store.spine.textColor(),
          textAlign: this.store.spine.textAlign(),
        },
      };
      let cancelled = false;
      resolveSpineSvgOptions(spine, w, h)
        .then((options) => {
          if (cancelled) {
            return;
          }
          const raw = buildSpineSvg(options);
          this.svg.set(this.sanitizer.bypassSecurityTrustHtml(raw));
        })
        .catch(() => {
          if (!cancelled) {
            this.svg.set(null);
          }
        });
      return () => {
        cancelled = true;
      };
    });
  }

  protected isBlank(): boolean {
    return this.store.spine.preset() === 'blank';
  }

  protected isKnown(): boolean {
    const p = this.store.spine.preset();
    return p === 'ps2' || p === 'xbox' || p === 'text';
  }
}
