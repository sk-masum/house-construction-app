import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule, OverlayModule, NzIconModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
  templateUrl: './select.component.html',
})
export class SelectComponent implements ControlValueAccessor {
  @Input() options: any[] = [];
  @Input() valueKey?: string; // Used if options are objects (e.g., 'id')
  @Input() labelKey?: string; // Used if options are objects (e.g., 'name')
  @Input() placeholder = 'Select...';
  @Input() nullLabel?: string; // e.g., 'All Site Works'

  // Allows parent to override button shape/styling
  @Input() triggerClass =
    'bg-neutral-800 py-2.5 rounded-lg border border-neutral-700 hover:border-neutral-600 w-full';

  value: any = null;
  isOpen = false;
  isDisabled = false;

  onChange = (value: any) => {};
  onTouched = () => {};

  writeValue(obj: any): void {
    this.value = obj;
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

  get displayValue(): string {
    if (this.value === null || this.value === undefined) {
      return this.nullLabel || this.placeholder;
    }
    if (this.valueKey && this.labelKey) {
      const selected = this.options.find(
        (o) => o[this.valueKey!] === this.value,
      );
      return selected ? selected[this.labelKey!] : this.placeholder;
    }
    return this.value; // For flat string arrays
  }

  selectOption(val: any) {
    this.value = val;
    this.onChange(this.value);
    this.onTouched();
    this.isOpen = false;
  }

  getOptionLabel(opt: any): string {
    return this.labelKey ? opt[this.labelKey] : opt;
  }

  getOptionValue(opt: any): any {
    return this.valueKey ? opt[this.valueKey] : opt;
  }
}
