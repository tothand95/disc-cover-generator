import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { CoverStore } from '../../services/cover.store';
import { DragDropService } from '../../services/drag-drop.service';
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
  readonly store = inject(CoverStore);
  readonly drag = inject(DragDropService);

  private readonly stageRef = viewChild.required<ElementRef<HTMLDivElement>>('stage');
  private readonly stageWidth = signal(0);

  protected readonly preset = this.store.activePreset;

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
    const mode = this.store.borders.mode();
    if (mode === 'none' || this.store.borders.thicknessPx() <= 0) {
      return 0;
    }
    const borderMm = (this.store.borders.thicknessPx() / 300) * 25.4;
    return Math.max(1, borderMm * this.mmToPx());
  });

  protected readonly outerShadow = computed(() => {
    const px = this.borderPx();
    const color = this.store.borders.color();
    return px > 0 && color ? `0 0 0 ${px}px ${color}` : 'none';
  });

  protected readonly frontTopImage = computed(() => {
    const p = this.store.spine.preset();
    if (!this.store.spine.showFrontImage()) {
      return null;
    }
    if (p !== 'ps2' && p !== 'xbox') {
      return null;
    }
    const key = p as SpinePresetImageKey;
    const sideWidthPx = this.sideWidthPx();
    const sideWidthMm = this.sideMm();
    const ar = getSpinePresetImageAspectRatio(key, 'front');
    const scale = sideWidthPx / ((sideWidthMm * 300) / 25.4);
    const wideningPx = this.store.spine.frontImageWidening() > 0 ? this.store.spine.frontImageWidening() * scale : 0;
    const separatorPx = key === 'ps2' && this.store.spine.showFrontSeparator() ? Math.max(1, 4 * scale) : 0;
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
      this.store.images.spine.set(file);
    }
    input.value = '';
  }
}
