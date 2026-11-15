import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'sk-datepicker',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatepickerComponent),
      multi: true,
    },
  ],
  templateUrl: './datepicker.component.html',
})
export class DatepickerComponent implements ControlValueAccessor {
  @Input() mode: 'date' | 'datetime' = 'date'; // 'date' or 'datetime'
  @Input() placeholder = 'Select date...';
  @Input() triggerClass =
    'bg-neutral-800 py-2.5 rounded-lg border border-neutral-700 hover:border-neutral-600 w-full';

  internalStringValue = '';
  isDisabled = false;

  onChange = (value: Date | null) => {};
  onTouched = () => {};

  writeValue(obj: any): void {
    if (obj) {
      const d = new Date(obj);
      this.internalStringValue = this.formatLocal(d, this.mode);
    } else {
      this.internalStringValue = '';
    }
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

  onInputChange(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.internalStringValue = val;

    if (val) {
      this.onChange(new Date(val));
    } else {
      this.onChange(null);
    }
    this.onTouched();
  }

  // Prevents the classic JavaScript UTC timezone shift bug
  private formatLocal(d: Date, mode: 'date' | 'datetime'): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const YYYY = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const DD = pad(d.getDate());

    if (mode === 'date') return `${YYYY}-${MM}-${DD}`;

    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
  }
}
