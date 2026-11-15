/**
 * ===================================================
 * BASE FORM COMPONENT
 * ===================================================
 * Abstract base class for form-based components.
 * Reduces boilerplate across components.
 *
 * Usage:
 *   export class MyFormComponent extends BaseFormComponent {
 *     protected initializeForm(): void {
 *       this.form = this.fb.group({...});
 *     }
 *   }
 * ===================================================
 */

import { OnInit, OnDestroy, ChangeDetectorRef, Directive } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Directive()
export abstract class BaseFormComponent implements OnInit, OnDestroy {
  protected form!: FormGroup;
  protected isDrawerVisible = false;

  constructor(
    protected fb: FormBuilder,
    protected cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnDestroy(): void {
    // Cleanup logic if needed in child classes
  }

  /**
   * Override in child class to initialize form
   */
  protected abstract initializeForm(): void;

  /**
   * Open drawer
   */
  openDrawer(): void {
    this.isDrawerVisible = true;
  }

  /**
   * Close drawer
   */
  closeDrawer(): void {
    this.isDrawerVisible = false;
  }

  /**
   * Submit form - override in child class
   */
  abstract submitForm(): Promise<void>;
}
