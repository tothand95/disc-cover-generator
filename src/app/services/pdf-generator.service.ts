import { Injectable } from '@angular/core';
import { generateCoverPdfInBrowser, type GenerateBrowserOptions } from '../utils/pdf/generate';

@Injectable({ providedIn: 'root' })
export class PdfGeneratorService {
  /**
   * Generates a cover PDF and opens it in a new tab via a blob URL.
   *
   * The tab is opened synchronously (with a blank placeholder) so the call
   * still sits inside the user-gesture that triggered generation — browsers
   * block popups opened after an `await`. Once the bytes are ready we
   * navigate the same tab to the blob URL, and revoke it after 60 s.
   */
  async generateAndOpen(options: GenerateBrowserOptions): Promise<void> {
    const win = window.open('', '_blank');
    if (!win) {
      throw new Error('Popup blocked — please allow popups for this site.');
    }
    try {
      const bytes = await generateCoverPdfInBrowser(options);
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
