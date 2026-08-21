import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { CoverStore } from '../../../services/cover.store';
import { DragDropService } from '../../../services/drag-drop.service';
import { DropOverlay } from '../../../shared/drop-overlay/drop-overlay';
import { Icon } from '../../../shared/icon/icon';
import { getSpinePresetImageAspectRatio, getSpinePresetImageUrl, type SpinePresetImageKey } from '../../../utils/spine/assets';
import { SectionImage } from '../section-image/section-image';
import { SpinePreset } from '../spine-preset/spine-preset';

@Component({
  selector: 'app-cover-preview-separate',
  standalone: true,
  imports: [SectionImage, DropOverlay, SpinePreset, Icon],
  templateUrl: './cover-preview-separate.html',
  styleUrl: './cover-preview-separate.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoverPreviewSeparateNew {
  readonly store = inject(CoverStore);
  readonly drag = inject(DragDropService);

  private readonly stageRef = viewChild.required<ElementRef<HTMLDivElement>>('stage');
  private readonly stageWidth = signal(0);

  protected readonly preset = this.store.activePreset;

  protected readonly aspect = computed(() => {
    const preset = this.preset();
    return `${preset.totalWidthMm} / ${preset.heightMm}`;
  });

  protected readonly gridCols = computed(() => {
    const preset = this.preset();
    const side = (preset.totalWidthMm - preset.spineWidthMm) / 2;
    return `${side}fr ${preset.spineWidthMm}fr ${side}fr`;
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
    const presetId = this.store.spine.preset();
    if (!this.store.spine.showFrontImage()) {
      return null;
    }
    if (presetId !== 'ps2' && presetId !== 'xbox') {
      return null;
    }
    const key = presetId as SpinePresetImageKey;
    const sideWidthPx = this.sideWidthPx();
    const sideWidthMm = this.sideMm();
    const aspectRatio = getSpinePresetImageAspectRatio(key, 'front');
    const scale = sideWidthPx / ((sideWidthMm * 300) / 25.4);
    const wideningPx = this.store.spine.frontImageWidening() > 0 ? this.store.spine.frontImageWidening() * scale : 0;
    const separatorPx = key === 'ps2' && this.store.spine.showFrontSeparator() ? Math.max(1, 4 * scale) : 0;
    const imgHeightPx = sideWidthPx / aspectRatio;
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
      const element = this.stageRef().nativeElement;
      const update = () => this.stageWidth.set(element.clientWidth);
      update();
      const resizeObserver = new ResizeObserver(update);
      resizeObserver.observe(element);
      onCleanup(() => resizeObserver.disconnect());
    });
  }

  onSpineFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file) {
      this.store.images.spineFile.set(file);
    }
    input.value = '';
  }
}
