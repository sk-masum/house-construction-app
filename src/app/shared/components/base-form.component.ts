/**
 * ===================================================
 * BASE FORM COMPONENT
 * ===================================================
 * Abstract base class for form-based components using Flatpickr
 * and native form controls. Reduces boilerplate across components.
 *
 * Usage:
 *   export class MyFormComponent extends BaseFormComponent {
 *     protected initializeForm(): void {
 *       this.form = this.fb.group({...});
 *     }
 *
 *     protected getDatePickerConfig(): DatePickerConfig {
 *       return { inputId: 'myDateInput', formControl: 'dateField' };
 *     }
 *   }
 * ===================================================
 */

import { OnInit, OnDestroy, ChangeDetectorRef, Directive } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { FlatpickrUtils } from '../utils/flatpickr.utils';

export interface DatePickerConfig {
  inputId: string;
  formControl: string;
  enableTime?: boolean;
}

@Directive()
export abstract class BaseFormComponent implements OnInit, OnDestroy {
  protected form!: FormGroup;
  protected isDrawerVisible = false;
  protected datetimePickerInstance: any;

  constructor(
    protected fb: FormBuilder,
    protected cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnDestroy(): void {
    this.cleanupDatePickers();
  }

  /**
   * Override in child class to initialize form
   */
  protected abstract initializeForm(): void;

  /**
   * Open drawer and initialize date pickers
   */
  openDrawer(): void {
    this.isDrawerVisible = true;
    // Give Angular time to render the drawer content
    setTimeout(() => this.initializeDatePickers(), 100);
  }

  /**
   * Close drawer and cleanup date pickers
   */
  closeDrawer(): void {
    this.isDrawerVisible = false;
    this.cleanupDatePickers();
  }

  /**
   * Initialize all date pickers in the form
   * Override in child class if you need custom date picker handling
   */
  protected initializeDatePickers(): void {
    const config = this.getDatePickerConfig();
    if (!config) return;

    const isDatetime = config.enableTime ?? false;

    if (isDatetime) {
      this.datetimePickerInstance = FlatpickrUtils.initializeDatetimePicker(
        this.form,
        config.inputId,
        config.formControl
      );
    } else {
      this.datetimePickerInstance = FlatpickrUtils.initializeDatePicker(
        this.form,
        config.inputId,
        config.formControl
      );
    }
  }

  /**
   * Override in child class to provide date picker configuration
   * Return null or undefined if component has no date pickers
   */
  protected getDatePickerConfig(): DatePickerConfig | null {
    return null;
  }

  /**
   * Cleanup date pickers before destroying component
   */
  protected cleanupDatePickers(): void {
    if (this.datetimePickerInstance) {
      FlatpickrUtils.destroy(this.datetimePickerInstance);
      this.datetimePickerInstance = null;
    }
  }

  /**
   * Submit form - override in child class
   */
  abstract submitForm(): Promise<void>;
}

/**
 * ===================================================
 * MIXIN FOR MULTIPLE DATE PICKERS
 * ===================================================
 * Use this mixin if you need to manage multiple date pickers
 */
export class MultiDatePickerMixin {
  private datePickerInstances: Map<string, any> = new Map();

  /**
   * Initialize multiple date pickers
   */
  initializeMultipleDatePickers(
    form: FormGroup,
    configs: DatePickerConfig[]
  ): void {
    configs.forEach((config) => {
      const isDatetime = config.enableTime ?? false;
      let instance: any;

      if (isDatetime) {
        instance = FlatpickrUtils.initializeDatetimePicker(
          form,
          config.inputId,
          config.formControl
        );
      } else {
        instance = FlatpickrUtils.initializeDatePicker(
          form,
          config.inputId,
          config.formControl
        );
      }

      if (instance) {
        this.datePickerInstances.set(config.inputId, instance);
      }
    });
  }

  /**
   * Cleanup all date pickers
   */
  cleanupAllDatePickers(): void {
    this.datePickerInstances.forEach((instance) => {
      FlatpickrUtils.destroy(instance);
    });
    this.datePickerInstances.clear();
  }
}
