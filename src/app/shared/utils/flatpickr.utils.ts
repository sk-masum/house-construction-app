/**
 * ===================================================
 * FLATPICKR FORM UTILITIES
 * ===================================================
 * Centralized utilities for Flatpickr datepicker initialization
 * and date formatting across form components.
 *
 * Usage:
 *   import { FlatpickrUtils } from '../../shared/utils/flatpickr.utils';
 *   FlatpickrUtils.initializeDatePicker(this.form, 'dateInput');
 * ===================================================
 */

import flatpickr from 'flatpickr';
import { FormGroup } from '@angular/forms';

export interface FlatpickrConfig {
  enableTime?: boolean;
  format?: string;
  time24hr?: boolean;
  formControl: string;
  inputId: string;
}

export class FlatpickrUtils {
  /**
   * Initialize a date picker (date only)
   * Format: YYYY-MM-DD
   */
  static initializeDatePicker(
    form: FormGroup,
    inputId: string,
    formControl: string = 'date'
  ): any {
    const inputElement = document.getElementById(inputId);
    if (!inputElement) {
      console.warn(`Flatpickr: Input element with id "${inputId}" not found`);
      return null;
    }

    const currentValue = form.get(formControl)?.value;
    const dateString = currentValue ? this.formatDateString(currentValue) : '';

    return flatpickr(`#${inputId}`, {
      enableTime: false,
      dateFormat: 'Y-m-d',
      defaultDate: dateString,
      onChange: (selectedDates) => {
        if (selectedDates.length > 0) {
          form.patchValue({ [formControl]: selectedDates[0] });
        }
      },
    });
  }

  /**
   * Initialize a datetime picker (date + time)
   * Format: YYYY-MM-DD HH:MM
   */
  static initializeDatetimePicker(
    form: FormGroup,
    inputId: string,
    formControl: string = 'dateTime'
  ): any {
    const inputElement = document.getElementById(inputId);
    if (!inputElement) {
      console.warn(`Flatpickr: Input element with id "${inputId}" not found`);
      return null;
    }

    const currentValue = form.get(formControl)?.value;
    const dateString = currentValue ? this.formatDatetimeString(currentValue) : '';

    return flatpickr(`#${inputId}`, {
      enableTime: true,
      dateFormat: 'Y-m-d H:i',
      time_24hr: true,
      defaultDate: dateString,
      onChange: (selectedDates) => {
        if (selectedDates.length > 0) {
          form.patchValue({ [formControl]: selectedDates[0] });
        }
      },
    });
  }

  /**
   * Initialize a custom Flatpickr instance with full config control
   */
  static initializeCustom(
    inputId: string,
    config: Partial<flatpickr.Options.Options> & {
      onChange?: (dates: Date[]) => void;
    }
  ): any {
    const inputElement = document.getElementById(inputId);
    if (!inputElement) {
      console.warn(`Flatpickr: Input element with id "${inputId}" not found`);
      return null;
    }

    return flatpickr(`#${inputId}`, config);
  }

  /**
   * Destroy a Flatpickr instance safely
   */
  static destroy(instance: any): void {
    if (instance && typeof instance.destroy === 'function') {
      instance.destroy();
    }
  }

  /**
   * Format Date object to YYYY-MM-DD string for Flatpickr
   */
  static formatDateString(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Format Date object to YYYY-MM-DD HH:MM string for Flatpickr
   */
  static formatDatetimeString(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  /**
   * Convert Flatpickr date string back to Date object if needed
   */
  static parseDate(dateString: string | null | undefined): Date | null {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Get today's date in Flatpickr format
   */
  static getTodayFormatted(): string {
    return this.formatDateString(new Date());
  }

  /**
   * Get current datetime in Flatpickr format
   */
  static getNowFormatted(): string {
    return this.formatDatetimeString(new Date());
  }
}

/**
 * ===================================================
 * FORM VALIDATION UTILITIES
 * ===================================================
 */
export class FormUtils {
  /**
   * Check if form field has error
   */
  static hasError(form: FormGroup, fieldName: string, errorType?: string): boolean {
    const field = form.get(fieldName);
    if (!field) return false;

    if (errorType) {
      return field.hasError(errorType) && (field.dirty || field.touched);
    }
    return field.invalid && (field.dirty || field.touched);
  }

  /**
   * Get error message for form field
   */
  static getErrorMessage(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.hasError('required')) {
      return 'This field is required';
    }
    if (field.hasError('min')) {
      return `Value must be at least ${field.getError('min').min}`;
    }
    if (field.hasError('max')) {
      return `Value must be at most ${field.getError('max').max}`;
    }
    if (field.hasError('minlength')) {
      return `Minimum length is ${field.getError('minlength').requiredLength}`;
    }
    if (field.hasError('maxlength')) {
      return `Maximum length is ${field.getError('maxlength').requiredLength}`;
    }
    if (field.hasError('pattern')) {
      return 'Invalid format';
    }
    if (field.hasError('email')) {
      return 'Invalid email address';
    }

    return 'Invalid input';
  }

  /**
   * Mark all fields as touched to trigger validation display
   */
  static markAllFieldsAsTouched(form: FormGroup): void {
    Object.keys(form.controls).forEach((key) => {
      const control = form.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markAllFieldsAsTouched(control);
      }
    });
  }

  /**
   * Reset form to initial state
   */
  static resetForm(form: FormGroup, initialValue?: any): void {
    if (initialValue) {
      form.reset(initialValue);
    } else {
      form.reset();
    }
    form.markAsPristine();
    form.markAsUntouched();
  }
}
