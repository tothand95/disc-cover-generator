import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { AppHeader } from './components/app-header/app-header';
import { CoverForm } from './components/cover-form/cover-form';
import { CoverPreviewSeparateNew } from './components/cover-preview/cover-preview-separate/cover-preview-separate';
import { CoverPreviewSingle } from './components/cover-preview/cover-preview-single/cover-preview-single';
import { CoverStore } from './services/cover.store';
import { DragDropService } from './services/drag-drop.service';
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

  constructor() {
    effect(() => this.store.ui.isDraggingFile.set(this.drag.isDraggingFile()));
  }
}
