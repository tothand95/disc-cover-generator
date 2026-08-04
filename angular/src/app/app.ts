import { Component, inject, signal } from '@angular/core';
import type { CasePresetId } from '@core/types';
import { PdfGeneratorService } from './services/pdf-generator.service';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('disc-cover-generator-app');
  protected readonly initialPreset: CasePresetId = 'dvd-normal';
  protected readonly pdf = inject(PdfGeneratorService);
}
