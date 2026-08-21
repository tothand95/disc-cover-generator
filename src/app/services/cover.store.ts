import { Injectable, computed, effect, signal } from '@angular/core';
import { getPreset } from '@core/presets';
import type { BorderMode, CasePresetId, FitMode, SpinePresetId, SpineTextAlign } from '@core/types';

/**
 * Single source of truth for all cover-generator state.
 *
 * Groups signals semantically (case, mode, images, spine, borders, ui) so
 * templates and services can read `store.spine.title()` without a huge
 * prop bag. Computed helper `activePreset` lives here
 * too so both the preview and the PDF pipeline read the same derived values.
 */
@Injectable({ providedIn: 'root' })
export class CoverStore {
  readonly case = {
    presetId: signal<CasePresetId>('dvd-normal'),
  };
  readonly activePreset = computed(() => getPreset(this.case.presetId()));

  readonly images = {
    kind: signal<'single' | 'three'>('three'),
    fit: signal<FitMode>('stretch'),
    fitBackground: signal('#000000'),
    singleFile: signal<File | null>(null),
    singleUrl: signal<string | null>(null),
    backFile: signal<File | null>(null),
    backUrl: signal<string | null>(null),
    frontFile: signal<File | null>(null),
    frontUrl: signal<string | null>(null),
    spineFile: signal<File | null>(null),
    spineUrl: signal<string | null>(null),
  };

  readonly spine = {
    preset: signal<SpinePresetId>('blank'),
    title: signal(''),
    background: signal('#ffffff'),
    textColor: signal('#000000'),
    textAlign: signal<SpineTextAlign>('center'),
    showFrontImage: signal(true),
    frontImageWidening: signal(0),
    showFrontSeparator: signal(true),
  };

  readonly borders = {
    mode: signal<BorderMode>('none'),
    thicknessPx: signal(2),
    color: signal('#000000'),
  };

  readonly ui = {
    busy: signal(false),
    isDraggingFile: signal(false),
  };

  constructor() {
    this.wireObjectUrl(() => this.images.singleFile(), this.images.singleUrl);
    this.wireObjectUrl(() => this.images.backFile(), this.images.backUrl);
    this.wireObjectUrl(() => this.images.frontFile(), this.images.frontUrl);
    this.wireObjectUrl(() => this.images.spineFile(), this.images.spineUrl);
  }

  private wireObjectUrl(fileGetter: () => File | null, urlSignal: ReturnType<typeof signal<string | null>>): void {
    let currentUrl: string | null = null;
    effect((onCleanup) => {
      const file = fileGetter();
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
        currentUrl = null;
      }
      if (file) {
        currentUrl = URL.createObjectURL(file);
        urlSignal.set(currentUrl);
      } else {
        urlSignal.set(null);
      }
      onCleanup(() => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
        }
        currentUrl = null;
      });
    });
  }
}
