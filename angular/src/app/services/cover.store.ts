import { Injectable, computed, signal } from '@angular/core';
import type {
  BorderMode,
  CasePresetId,
  FitMode,
  SpinePresetId,
  SpineTextAlign,
} from '@core/types';
import { CASE_PRESETS, getPreset } from '@core/presets';

/**
 * Single source of truth for all cover-generator state.
 *
 * Groups signals semantically (case, mode, images, spine, borders, ui) so
 * templates and services can read `store.spine.title()` without a huge
 * prop bag. Computed helpers (`activePreset`, `spinePresetInput`) live here
 * too so both the preview and the PDF pipeline read the same derived values.
 */
@Injectable({ providedIn: 'root' })
export class CoverStore {
  readonly presets = Object.values(CASE_PRESETS);

  readonly case = {
    presetId: signal<CasePresetId>('dvd-normal'),
  };
  readonly activePreset = computed(() => getPreset(this.case.presetId()));

  readonly mode = {
    kind: signal<'single' | 'three'>('three'),
    fit: signal<FitMode>('stretch'),
    fitBackground: signal('#000000'),
  };

  readonly images = {
    single: signal<File | null>(null),
    back: signal<File | null>(null),
    front: signal<File | null>(null),
    spine: signal<File | null>(null),
  };

  readonly spine = {
    preset: signal<SpinePresetId>('ps2'),
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

  /** Convenience: `SpinePresetInput` derived from the spine signals, or null when a spine image is uploaded. */
  readonly spinePresetInput = computed(() => {
    if (this.images.spine()) return null;
    return {
      preset: this.spine.preset(),
      title: this.spine.title(),
      extras: {
        backgroundColor: this.spine.background(),
        textColor: this.spine.textColor(),
        textAlign: this.spine.textAlign(),
        showFrontImage: this.spine.showFrontImage(),
        frontImageWidening: this.spine.frontImageWidening(),
        showFrontSeparator: this.spine.showFrontSeparator(),
      },
    };
  });
}
