import { UpperCasePipe } from '@angular/common';
import { Component, ChangeDetectionStrategy, Injector, effect, inject, input, signal } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { buildSpineSvg } from '@core/spine/svg';
import type { SpinePresetId, SpinePresetInput, SpineTextAlign } from '@core/types';
import { resolveSpineSvgOptions } from '../../utils/spine/buildOptions';

/**
 * Renders a spine preset as inline SVG, going through the same
 * buildSpineSvg / resolveSpineSvgOptions pipeline as the PDF rasterizer.
 * The preview is bypassSecurityTrustHtml'd — inputs are trusted because
 * they come from our own SVG builder.
 */
@Component({
  selector: 'app-spine-preset-preview',
  standalone: true,
  imports: [UpperCasePipe],
  templateUrl: './spine-preset-preview.html',
  styleUrl: './spine-preset-preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpinePresetPreview {
  readonly preset = input.required<SpinePresetId>();
  readonly title = input<string>('');
  readonly widthPx = input.required<number>();
  readonly heightPx = input.required<number>();
  readonly background = input<string>('#ffffff');
  readonly textColor = input<string>('#000000');
  readonly textAlign = input<SpineTextAlign>('center');

  private readonly sanitizer = inject(DomSanitizer);
  private readonly injector = inject(Injector);
  protected readonly svg = signal<SafeHtml | null>(null);

  constructor() {
    effect(() => {
      const preset = this.preset();
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
        title: this.title(),
        extras: {
          backgroundColor: this.background(),
          textColor: this.textColor(),
          textAlign: this.textAlign(),
        },
      };
      let cancelled = false;
      resolveSpineSvgOptions(spine, w, h)
        .then((opts) => {
          if (cancelled) {
            return;
          }
          const raw = buildSpineSvg(opts);
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
    return this.preset() === 'blank';
  }

  protected isKnown(): boolean {
    const p = this.preset();
    return p === 'ps2' || p === 'xbox' || p === 'text';
  }
}
