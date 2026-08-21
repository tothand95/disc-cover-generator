import { inject, Injectable } from '@angular/core';
import { CoverStore } from './cover.store';
import { generateCoverPdf, type SingleInput, type ThreeInput } from '../utils/pdf/generate';

@Injectable({ providedIn: 'root' })
export class PdfGeneratorService {
  private readonly store = inject(CoverStore);

  private buildInput(): SingleInput | ThreeInput {
    const store = this.store;

    if (store.images.kind() === 'single') {
      return { kind: 'single', image: store.images.singleFile()! };
    }

    let spinePreset = null;
    if (!store.images.spineFile()) {
      spinePreset = {
        preset: store.spine.preset(),
        title: store.spine.title(),
        extras: {
          backgroundColor: store.spine.background(),
          textColor: store.spine.textColor(),
          textAlign: store.spine.textAlign(),
          showFrontImage: store.spine.showFrontImage(),
          frontImageWidening: store.spine.frontImageWidening(),
          showFrontSeparator: store.spine.showFrontSeparator(),
        },
      };
    }

    return {
      kind: 'three',
      back: store.images.backFile()!,
      front: store.images.frontFile()!,
      spineImage: store.images.spineFile(),
      spinePreset,
    };
  }

  /**
   * Assembles options from CoverStore, generates a cover PDF and opens it
   * in a new tab via a blob URL.
   *
   * The tab is opened synchronously (with a blank placeholder) so the call
   * still sits inside the user-gesture that triggered generation — browsers
   * block popups opened after an `await`. Once the bytes are ready we
   * navigate the same tab to the blob URL, and revoke it after 60 s.
   */
  async generateAndOpen(): Promise<void> {
    const win = window.open('', '_blank');
    if (!win) {
      throw new Error('Popup blocked — please allow popups for this site.');
    }
    try {
      const store = this.store;
      const bytes = await generateCoverPdf({
        presetId: store.case.presetId(),
        fit: store.images.fit(),
        border: {
          mode: store.borders.mode(),
          thicknessPx: store.borders.thicknessPx(),
          color: store.borders.color(),
        },
        fitBackground: store.images.fitBackground(),
        dpi: 300,
        input: this.buildInput(),
      });
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      win.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      win.close();
      throw err;
    }
  }
}
