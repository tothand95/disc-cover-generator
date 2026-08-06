import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';
import { Icon } from '../icon/icon';

/**
 * Renders active toasts fixed to the bottom-center of the viewport.
 * Wire once at the app root; the service handles the queue.
 */
@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [Icon],
  templateUrl: './toast-container.html',
  styleUrl: './toast-container.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainer {
  protected readonly toasts = inject(ToastService);
}
