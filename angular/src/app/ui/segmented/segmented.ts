import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface SegmentedOption<T> {
  label: string;
  value: T;
  disabled?: boolean;
}

@Component({
  selector: 'app-segmented',
  standalone: true,
  templateUrl: './segmented.html',
  styleUrl: './segmented.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Segmented<T> {
  readonly options = input.required<readonly SegmentedOption<T>[]>();
  readonly value = model.required<T>();
  readonly ariaLabel = input<string>('');

  protected select(v: T): void {
    if (v !== this.value()) {
      this.value.set(v);
    }
  }

  protected trackByValue(_: number, opt: SegmentedOption<T>): unknown {
    return opt.value;
  }
}
