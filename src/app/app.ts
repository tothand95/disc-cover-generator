import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { CoverForm } from './components/cover-form/cover-form';
import { CoverPreviewSeparateNew } from './components/cover-preview-separate-new/cover-preview-separate-new';
import { CoverPreviewSingle } from './components/cover-preview-single/cover-preview-single';
import { CoverStore } from './services/cover.store';
import { DragDropService } from './services/drag-drop.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { ThemeService } from './services/theme.service';
import { ToastService } from './services/toast.service';
import { Icon } from './shared/icon/icon';
import { ToastContainer } from './shared/toast-container/toast-container';

/**
 * App shell: hosts the form, the live preview and the drag-drop backdrop.
 * State lives in CoverStore — preview components inject it directly.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CoverForm, CoverPreviewSingle, CoverPreviewSeparateNew, ToastContainer, Icon],
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

  constructor() {
    effect(() => this.store.ui.isDraggingFile.set(this.drag.isDraggingFile()));
  }

  async onGenerate(): Promise<void> {
    const store = this.store;
    try {
      if (store.mode.kind() === 'single') {
        if (!store.images.single()) {
          throw new Error('Please choose an image.');
        }
      } else if (!store.images.back() || !store.images.front()) {
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
