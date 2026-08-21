import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from '../../services/theme.service';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [Icon],
  templateUrl: './app-header.html',
  styleUrl: './app-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeader {
  readonly theme = inject(ThemeService);
}
