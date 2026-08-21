import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { buildSpineSvg } from '@core/spine/svg';
import type { SpinePresetInput } from '@core/types';
import { CoverStore } from '../../../services/cover.store';
import { resolveSpineSvgOptions } from '../../../utils/spine/buildOptions';

/** Fixed reference width for SVG generation — CSS scales the result to fill the cell. */
const REFERENCE_WIDTH_PX = 100;

/**
 * Renders a spine preset as inline SVG, going through the same
 * buildSpineSvg / resolveSpineSvgOptions pipeline as the PDF rasterizer.
 * Uses a fixed reference size and CSS scaling instead of pixel-accurate
 * dimensions, since the preview and PDF already differ in DPI.
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
  readonly store = inject(CoverStore);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly svg = signal<SafeHtml | null>(null);

  private readonly referenceHeight = computed(() => {
    const preset = this.store.activePreset();
    return Math.round((preset.heightMm / preset.spineWidthMm) * REFERENCE_WIDTH_PX);
  });

  constructor() {
    effect(() => {
      const preset = this.store.spine.preset();
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
      const heightPx = this.referenceHeight();
      let cancelled = false;
      resolveSpineSvgOptions(spine, REFERENCE_WIDTH_PX, heightPx)
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
    const presetId = this.store.spine.preset();
    return presetId === 'ps2' || presetId === 'xbox' || presetId === 'text';
  }
}
