import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'sk-textfield',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextfieldComponent),
      multi: true,
    },
  ],
  templateUrl: './textfield.component.html',
})
export class TextfieldComponent implements ControlValueAccessor {
  @Input() type: 'text' | 'number' | 'password' | 'email' = 'text';
  @Input() placeholder = '';
  @Input() icon?: string; // Optional NG-ZORRO icon name (e.g., 'user', 'dollar')
  @Input() inputClass =
    'bg-neutral-800 py-3 rounded-lg border border-neutral-700 hover:border-neutral-600 focus:border-emerald-500 w-full';

  value: any = '';
  isDisabled = false;

  onChange = (value: any) => {};
  onTouched = () => {};

  writeValue(obj: any): void {
    this.value = obj !== undefined && obj !== null ? obj : '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  onInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    // Automatically convert to number if type is number
    this.value = this.type === 'number' && val !== '' ? Number(val) : val;
    this.onChange(this.value);
    this.onTouched();
  }
}
