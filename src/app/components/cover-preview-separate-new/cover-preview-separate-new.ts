import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';
import type { BorderMode, CasePreset, FitMode, SpinePresetId, SpineTextAlign } from '@core/types';
import { Icon } from '../../shared/icon/icon';
import { getSpinePresetImageAspectRatio, getSpinePresetImageUrl, type SpinePresetImageKey } from '../../utils/spine/assets';
import { DropOverlay } from '../drop-overlay/drop-overlay';
import { SectionImage } from '../section-image/section-image';
import { SpinePresetPreview } from '../spine-preset-preview/spine-preset-preview';

@Component({
  selector: 'app-cover-preview-separate-new',
  standalone: true,
  imports: [SectionImage, DropOverlay, SpinePresetPreview, Icon],
  templateUrl: './cover-preview-separate-new.html',
  styleUrl: './cover-preview-separate-new.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoverPreviewSeparateNew {
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

  private readonly stageRef = viewChild.required<ElementRef<HTMLDivElement>>('stage');
  private readonly stageWidth = signal(0);

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

  protected readonly mmToPx = computed(() => {
    const w = this.stageWidth();
    return w > 0 ? w / this.preset().totalWidthMm : 0;
  });

  protected readonly spineWidthPx = computed(() => this.preset().spineWidthMm * this.mmToPx());
  protected readonly stageHeightPx = computed(() => this.preset().heightMm * this.mmToPx());
  protected readonly sideWidthPx = computed(() => this.sideMm() * this.mmToPx());

  protected readonly borderPx = computed(() => {
    const mode = this.borderMode();
    if (mode === 'none' || this.borderThicknessPx() <= 0) {
      return 0;
    }
    const borderMm = (this.borderThicknessPx() / this.dpi()) * 25.4;
    return Math.max(1, borderMm * this.mmToPx());
  });

  protected readonly outerShadow = computed(() => {
    const px = this.borderPx();
    return px > 0 && this.borderColor() ? `0 0 0 ${px}px ${this.borderColor()}` : 'none';
  });

  protected readonly frontTopImage = computed(() => {
    const p = this.spinePreset();
    if (!this.showFrontPresetImage()) {
      return null;
    }
    if (p !== 'ps2' && p !== 'xbox') {
      return null;
    }
    const key = p as SpinePresetImageKey;
    const sideWidthPx = this.sideWidthPx();
    const sideWidthMm = this.sideMm();
    const ar = getSpinePresetImageAspectRatio(key, 'front');
    const scale = sideWidthPx / ((sideWidthMm * this.dpi()) / 25.4);
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
      const el = this.stageRef().nativeElement;
      const update = () => this.stageWidth.set(el.clientWidth);
      update();
      const ro = new ResizeObserver(update);
      ro.observe(el);
      onCleanup(() => ro.disconnect());
    });
  }

  onSpineFilePicked(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file) {
      this.spineSelected.emit(file);
    }
    input.value = '';
  }
}
