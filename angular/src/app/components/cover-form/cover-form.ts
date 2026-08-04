import { FormsModule } from '@angular/forms';
import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  output,
} from '@angular/core';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ColorPickerModule } from 'primeng/colorpicker';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { CoverStore } from '../../services/cover.store';
import { FileInput } from '../file-input/file-input';

/**
 * The whole left-column form. Reads/writes state directly through the
 * CoverStore signals so we never pass a prop bag through the tree.
 */
@Component({
  selector: 'app-cover-form',
  standalone: true,
  imports: [
    FormsModule,
    SelectModule,
    SelectButtonModule,
    InputNumberModule,
    InputTextModule,
    ColorPickerModule,
    ButtonModule,
    MessageModule,
    FileInput,
  ],
  templateUrl: './cover-form.html',
  styleUrl: './cover-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoverForm {
  readonly store = inject(CoverStore);

  readonly presetOptions = this.store.presets.map((p) => ({
    label: `${p.label} (${p.totalWidthMm}×${p.heightMm}mm, spine ${p.spineWidthMm}mm)`,
    value: p.id,
  }));

  readonly kindOptions = [
    { label: 'Single image', value: 'single' },
    { label: 'Separate images', value: 'three' },
  ];

  readonly fitOptions = [
    { label: 'Stretch', value: 'stretch' },
    { label: 'Fill (cover)', value: 'fill' },
    { label: 'Fit (contain)', value: 'fit' },
  ];

  readonly borderOptions = [
    { label: 'None', value: 'none' },
    { label: 'Outer', value: 'outer' },
    { label: 'All', value: 'sections' },
  ];

  readonly spinePresetOptions = [
    { label: 'Blank (solid color)', value: 'blank' },
    { label: 'Text only', value: 'text' },
    { label: 'PS2', value: 'ps2' },
    { label: 'Xbox', value: 'xbox' },
    { label: 'Xbox 360 (coming soon)', value: 'xbox360', disabled: true },
  ];

  readonly textAlignOptions = [
    { label: 'Top', value: 'start' },
    { label: 'Center', value: 'center' },
    { label: 'Bottom', value: 'end' },
  ];

  readonly toggleOptions = [
    { label: 'Off', value: false },
    { label: 'On', value: true },
  ];

  protected readonly showSpineSection = computed(
    () => this.store.mode.kind() === 'three' && !this.store.images.spine(),
  );

  protected readonly hasSpineTitle = computed(() => {
    const p = this.store.spine.preset();
    return p === 'ps2' || p === 'xbox' || p === 'text';
  });

  protected readonly hasFrontImageToggle = computed(() => {
    const p = this.store.spine.preset();
    return p === 'ps2' || p === 'xbox';
  });

  protected readonly hasSeparatorToggle = computed(
    () => this.store.spine.preset() === 'ps2' && this.store.spine.showFrontImage(),
  );

  protected readonly hasColorPickers = computed(() => {
    const p = this.store.spine.preset();
    return p === 'blank' || p === 'text';
  });

  protected readonly isTextPreset = computed(() => this.store.spine.preset() === 'text');

  onSubmit(): void {
    this.submit.emit();
  }

  readonly submit = output<void>();
}
