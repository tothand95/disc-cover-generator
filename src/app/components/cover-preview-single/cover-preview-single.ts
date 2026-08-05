import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { BorderMode, CasePreset, FitMode } from '@core/types';
import { SectionImage } from '../section-image/section-image';
import { DropOverlay } from '../drop-overlay/drop-overlay';
import { borderPreviewPx, computeStageLayout } from '../../utils/stage-layout';

/**
 * Single-image preview. Renders one section for the whole cover, with
 * optional outer border shadow. Fit background is shown when fit='fit'.
 */
@Component({
  selector: 'app-cover-preview-single',
  standalone: true,
  imports: [SectionImage, DropOverlay],
  templateUrl: './cover-preview-single.html',
  styleUrl: './cover-preview-single.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoverPreviewSingle {
  readonly preset = input.required<CasePreset>();
  readonly fit = input.required<FitMode>();
  readonly borderMode = input<BorderMode>('none');
  readonly borderThicknessPx = input<number>(0);
  readonly borderColor = input<string>('#000000');
  readonly fitBackground = input<string>('#000000');
  readonly dpi = input<number>(300);
  readonly imageUrl = input<string | null>(null);
  readonly isDraggingFile = input<boolean>(false);
  readonly fileSelected = output<File | null>();

  private readonly wrapRef = viewChild.required<ElementRef<HTMLDivElement>>('wrap');
  private readonly labelsRef = viewChild.required<ElementRef<HTMLDivElement>>('labels');
  private readonly containerSize = signal({ width: 0, height: 0 });
  private readonly labelsSize = signal({ width: 0, height: 0 });
  private wrapObserver: ResizeObserver | null = null;
  private labelsObserver: ResizeObserver | null = null;

  protected readonly layout = computed(() =>
    computeStageLayout(
      this.preset(),
      this.containerSize().width,
      this.containerSize().height,
      this.labelsSize().height,
    ),
  );
  protected readonly borderPx = computed(() =>
    borderPreviewPx(
      this.borderMode(),
      this.borderThicknessPx(),
      this.layout().mmToPx,
      this.dpi(),
    ),
  );
  protected readonly outerShadow = computed(() => {
    const px = this.borderPx();
    return px > 0 && this.borderColor()
      ? `0 0 0 ${px}px ${this.borderColor()}`
      : 'none';
  });

  constructor() {
    inject(ElementRef);
    effect((onCleanup) => {
      const wrap = this.wrapRef().nativeElement;
      const labels = this.labelsRef().nativeElement;
      const update = () => {
        this.containerSize.set({ width: wrap.clientWidth, height: wrap.clientHeight });
        this.labelsSize.set({ width: labels.clientWidth, height: labels.clientHeight });
      };
      update();
      this.wrapObserver = new ResizeObserver(update);
      this.labelsObserver = new ResizeObserver(update);
      this.wrapObserver.observe(wrap);
      this.labelsObserver.observe(labels);
      onCleanup(() => {
        this.wrapObserver?.disconnect();
        this.labelsObserver?.disconnect();
      });
    });
  }
}
