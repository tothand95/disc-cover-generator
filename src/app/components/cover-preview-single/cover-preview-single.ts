import { Component, ChangeDetectionStrategy, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { CoverStore } from '../../services/cover.store';
import { DragDropService } from '../../services/drag-drop.service';
import { SectionImage } from '../section-image/section-image';
import { DropOverlay } from '../drop-overlay/drop-overlay';

@Component({
  selector: 'app-cover-preview-single',
  standalone: true,
  imports: [SectionImage, DropOverlay],
  templateUrl: './cover-preview-single.html',
  styleUrl: './cover-preview-single.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoverPreviewSingle {
  readonly store = inject(CoverStore);
  readonly drag = inject(DragDropService);

  private readonly stageRef = viewChild.required<ElementRef<HTMLDivElement>>('stage');
  private readonly stageWidth = signal(0);

  protected readonly preset = this.store.activePreset;

  protected readonly aspect = computed(() => {
    const p = this.preset();
    return `${p.totalWidthMm} / ${p.heightMm}`;
  });

  protected readonly mmToPx = computed(() => {
    const w = this.stageWidth();
    return w > 0 ? w / this.preset().totalWidthMm : 0;
  });

  protected readonly borderPx = computed(() => {
    const mode = this.store.borders.mode();
    if (mode === 'none' || this.store.borders.thicknessPx() <= 0) return 0;
    const borderMm = (this.store.borders.thicknessPx() / 300) * 25.4;
    return Math.max(1, borderMm * this.mmToPx());
  });

  protected readonly outerShadow = computed(() => {
    const px = this.borderPx();
    const color = this.store.borders.color();
    return px > 0 && color ? `0 0 0 ${px}px ${color}` : 'none';
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
}
