import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CoverStore } from './services/cover.store';
import { DragDropService } from './services/drag-drop.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { ThemeService } from './services/theme.service';
import { ToastService } from './services/toast.service';
import { CoverForm } from './components/cover-form/cover-form';
import { CoverPreviewSingle } from './components/cover-preview-single/cover-preview-single';
import { CoverPreviewSeparate } from './components/cover-preview-separate/cover-preview-separate';
import { ToastContainer } from './ui/toast-container/toast-container';

/**
 * App shell: hosts the form, the live preview and the drag-drop backdrop.
 * State lives in CoverStore — this component wires signals to the visible
 * children and triggers the PDF generator on submit.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CoverForm, CoverPreviewSingle, CoverPreviewSeparate, ToastContainer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  readonly store = inject(CoverStore);
  readonly drag = inject(DragDropService);
  readonly theme = inject(ThemeService);
  private readonly pdf = inject(PdfGeneratorService);
  private readonly toasts = inject(ToastService);

  private readonly singleUrl = signal<string | null>(null);
  private readonly backUrl = signal<string | null>(null);
  private readonly frontUrl = signal<string | null>(null);
  private readonly spineUrl = signal<string | null>(null);

  readonly singleUrlView = this.singleUrl.asReadonly();
  readonly backUrlView = this.backUrl.asReadonly();
  readonly frontUrlView = this.frontUrl.asReadonly();
  readonly spineUrlView = this.spineUrl.asReadonly();

  protected readonly coverAspectVar = computed(() => {
    const p = this.store.activePreset();
    return `${p.totalWidthMm} / ${p.heightMm}`;
  });

  constructor() {
    effect(() => this.store.ui.isDraggingFile.set(this.drag.isDraggingFile()));

    this.wireObjectUrl(() => this.store.images.single(), this.singleUrl);
    this.wireObjectUrl(() => this.store.images.back(), this.backUrl);
    this.wireObjectUrl(() => this.store.images.front(), this.frontUrl);
    this.wireObjectUrl(() => this.store.images.spine(), this.spineUrl);
  }

  private wireObjectUrl(
    fileGetter: () => File | null,
    urlSignal: ReturnType<typeof signal<string | null>>,
  ): void {
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
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        currentUrl = null;
      });
    });
  }

  async onGenerate(): Promise<void> {
    const store = this.store;
    try {
      if (store.mode.kind() === 'single') {
        if (!store.images.single()) throw new Error('Please choose an image.');
      } else {
        if (!store.images.back() || !store.images.front())
          throw new Error('Please choose both back and front images.');
      }

      store.ui.busy.set(true);

      const kind = store.mode.kind();
      await this.pdf.generateAndOpen({
        presetId: store.case.presetId(),
        fit: store.mode.fit(),
        border: {
          mode: store.borders.mode(),
          thicknessPx: store.borders.thicknessPx(),
          color: store.borders.color(),
        },
        fitBackground: store.mode.fitBackground(),
        dpi: 300,
        input:
          kind === 'single'
            ? { kind: 'single', image: store.images.single()! }
            : {
                kind: 'three',
                back: store.images.back()!,
                front: store.images.front()!,
                spineImage: store.images.spine(),
                spinePreset: store.images.spine() ? null : store.spinePresetInput(),
              },
      });
      this.toasts.success('PDF generated — opened in a new tab.');
    } catch (err) {
      this.toasts.error(err instanceof Error ? err.message : String(err));
    } finally {
      store.ui.busy.set(false);
    }
  }
}
