import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { AppHeader } from './components/app-header/app-header';
import { CoverForm } from './components/cover-form/cover-form';
import { CoverPreviewSeparateNew } from './components/cover-preview-separate/cover-preview-separate';
import { CoverPreviewSingle } from './components/cover-preview-single/cover-preview-single';
import { CoverStore } from './services/cover.store';
import { DragDropService } from './services/drag-drop.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { ToastService } from './services/toast.service';
import { ToastContainer } from './shared/toast-container/toast-container';

/**
 * App shell: hosts the form, the live preview and the drag-drop backdrop.
 * State lives in CoverStore — preview components inject it directly.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AppHeader, CoverForm, CoverPreviewSingle, CoverPreviewSeparateNew, ToastContainer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  readonly store = inject(CoverStore);
  readonly drag = inject(DragDropService);
  private readonly pdf = inject(PdfGeneratorService);
  private readonly toasts = inject(ToastService);

  constructor() {
    effect(() => this.store.ui.isDraggingFile.set(this.drag.isDraggingFile()));
  }

  async onGenerate(): Promise<void> {
    const store = this.store;
    try {
      if (store.images.kind() === 'single') {
        if (!store.images.singleFile()) {
          throw new Error('Please choose an image.');
        }
      } else if (!store.images.backFile() || !store.images.frontFile()) {
        throw new Error('Please choose both back and front images.');
      }

      store.ui.busy.set(true);

      const kind = store.images.kind();
      await this.pdf.generateAndOpen({
        presetId: store.case.presetId(),
        fit: store.images.fit(),
        border: {
          mode: store.borders.mode(),
          thicknessPx: store.borders.thicknessPx(),
          color: store.borders.color(),
        },
        fitBackground: store.images.fitBackground(),
        dpi: 300,
        input:
          kind === 'single'
            ? { kind: 'single', image: store.images.singleFile()! }
            : {
                kind: 'three',
                back: store.images.backFile()!,
                front: store.images.frontFile()!,
                spineImage: store.images.spineFile(),
                spinePreset: store.images.spineFile()
                  ? null
                  : {
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
                    },
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
