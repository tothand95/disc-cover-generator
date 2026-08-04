import { Injectable } from '@angular/core';
import {
  generateCoverPdfInBrowser,
  type GenerateBrowserOptions,
} from '../pdf/generate';

@Injectable({ providedIn: 'root' })
export class PdfGeneratorService {
  /**
   * Generates a cover PDF, opens it in a new tab via a blob URL, and revokes
   * the URL after 60 seconds. Throws if the browser blocks the popup.
   */
  async generateAndOpen(opts: GenerateBrowserOptions): Promise<void> {
    const bytes = await generateCoverPdfInBrowser(opts);
    const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      URL.revokeObjectURL(url);
      throw new Error('Popup blocked — please allow popups for this site.');
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
