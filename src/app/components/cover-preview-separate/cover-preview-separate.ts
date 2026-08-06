import { Component, ChangeDetectionStrategy, ElementRef, computed, effect, input, output, signal, viewChild } from '@angular/core';
import type { BorderMode, CasePreset, FitMode, SpinePresetId, SpineTextAlign } from '@core/types';
import { SectionImage } from '../section-image/section-image';
import { DropOverlay } from '../drop-overlay/drop-overlay';
import { SpinePresetPreview } from '../spine-preset-preview/spine-preset-preview';
import { Icon } from '../../shared/icon/icon';
import { borderPreviewPx, computeStageLayout } from '../../utils/stage-layout';
import { MM_PER_INCH } from '../../pdf/layout';
import { getSpinePresetImageAspectRatio, getSpinePresetImageUrl, type SpinePresetImageKey } from '../../utils/spine/assets';

/**
 * Three-section preview (back / spine / front). Also overlays the spine
 * preset's front-cover top image when applicable (ps2/xbox), including
 * the widening padding and PS2 white separator.
 */
@Component({
  selector: 'app-cover-preview-separate',
  standalone: true,
  imports: [SectionImage, DropOverlay, SpinePresetPreview, Icon],
  templateUrl: './cover-preview-separate.html',
  styleUrl: './cover-preview-separate.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoverPreviewSeparate {
  readonly preset = input.required<CasePreset>();
  readonly fit = input.required<FitMode>();
  readonly borderMode = input<BorderMode>('none');
  readonly borderThicknessPx = input<number>(0);
  readonly borderColor = input<string>('#000000');
  readonly fitBackground = input<string>('#000000');
  readonly dpi = input<number>(300);

  readonly backUrl = input<string | null>(null);
  readonly frontUrl = input<string | null>(null);
  readonly spineUrl = input<string | null>(null);
  readonly spinePreset = input.required<SpinePresetId>();
  readonly spineTitle = input<string>('');
  readonly spineBg = input<string>('#ffffff');
  readonly spineTextColor = input<string>('#000000');
  readonly spineTextAlign = input<SpineTextAlign>('center');
  readonly showFrontPresetImage = input<boolean>(true);
  readonly frontImageWidening = input<number>(0);
  readonly showFrontSeparator = input<boolean>(true);
  readonly isDraggingFile = input<boolean>(false);

  readonly backSelected = output<File | null>();
  readonly frontSelected = output<File | null>();
  readonly spineSelected = output<File | null>();

  private readonly wrapRef = viewChild.required<ElementRef<HTMLDivElement>>('wrap');
  private readonly labelsRef = viewChild.required<ElementRef<HTMLDivElement>>('labels');
  private readonly containerSize = signal({ width: 0, height: 0 });
  private readonly labelsSize = signal({ width: 0, height: 0 });

  protected readonly layout = computed(() =>
    computeStageLayout(this.preset(), this.containerSize().width, this.containerSize().height, this.labelsSize().height),
  );
  protected readonly borderPx = computed(() => borderPreviewPx(this.borderMode(), this.borderThicknessPx(), this.layout().mmToPx, this.dpi()));
  protected readonly outerShadow = computed(() => {
    const px = this.borderPx();
    return px > 0 && this.borderColor() ? `0 0 0 ${px}px ${this.borderColor()}` : 'none';
  });
  protected readonly gridTemplateCols = computed(() => {
    const p = this.preset();
    const side = (p.totalWidthMm - p.spineWidthMm) / 2;
    return `${side}fr ${p.spineWidthMm}fr ${side}fr`;
  });

  protected readonly frontTopImage = computed(() => {
    const p = this.spinePreset();
    if (!this.showFrontPresetImage()) return null;
    if (p !== 'ps2' && p !== 'xbox') return null;
    const key = p as SpinePresetImageKey;
    const layout = this.layout();
    const sideWidthMm = layout.sideWidthMm;
    const sideWidthPx = layout.sideWidthPx;
    const ar = getSpinePresetImageAspectRatio(key, 'front');
    const scale = sideWidthPx / ((sideWidthMm * this.dpi()) / MM_PER_INCH);
    const wideningPx = this.frontImageWidening() > 0 ? this.frontImageWidening() * scale : 0;
    const separatorPx = key === 'ps2' && this.showFrontSeparator() ? Math.max(1, 4 * scale) : 0;
    const imgHeightPx = sideWidthPx / ar;
    const blockHeightPx = imgHeightPx + wideningPx * 2;
    return {
      url: getSpinePresetImageUrl(key, 'front'),
      wideningPx,
      separatorPx,
      imgHeightPx,
      blockHeightPx,
    };
  });

  constructor() {
    effect((onCleanup) => {
      const wrap = this.wrapRef().nativeElement;
      const labels = this.labelsRef().nativeElement;
      const update = () => {
        this.containerSize.set({ width: wrap.clientWidth, height: wrap.clientHeight });
        this.labelsSize.set({ width: labels.clientWidth, height: labels.clientHeight });
      };
      update();
      const wo = new ResizeObserver(update);
      const lo = new ResizeObserver(update);
      wo.observe(wrap);
      lo.observe(labels);
      onCleanup(() => {
        wo.disconnect();
        lo.disconnect();
      });
    });
  }

  onSpineFilePicked(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file) this.spineSelected.emit(file);
    input.value = '';
  }
}
