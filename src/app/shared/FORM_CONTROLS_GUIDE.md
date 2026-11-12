# Centralized Form Controls & Utilities Guide

## Overview

This guide explains how to use the centralized form control styles and utilities to build iOS-optimized forms with native controls and Flatpickr datepickers.

## File Structure

```
src/app/shared/
├── styles/
│   └── form-controls.scss         # Centralized form control CSS
├── utils/
│   └── flatpickr.utils.ts         # Flatpickr initialization utilities
└── components/
    └── base-form.component.ts     # Base class for form components
```

## Usage Guide

### 1. Using Centralized Form Control Styles

#### In your component SCSS file:

```scss
// Import centralized form styles
@import '../../shared/styles/form-controls';

// Or just use the classes directly in HTML
```

#### HTML Classes Available:

```html
<!-- Standard form control (input, select, textarea) -->
<input type="text" class="form-control" />
<select class="form-control"></select>

<!-- Form group with label -->
<div class="form-group">
  <label class="required">Field Name</label>
  <input type="text" class="form-control" />
</div>

<!-- Two-column grid -->
<div class="form-row grid-cols-2">
  <div class="form-group">
    <label>Field 1</label>
    <input type="text" class="form-control" />
  </div>
  <div class="form-group">
    <label>Field 2</label>
    <input type="text" class="form-control" />
  </div>
</div>

<!-- Flatpickr date input -->
<input type="text" id="dateInput" class="flatpickr-input" />

<!-- Button with safe area padding -->
<button class="btn-safe-area">Submit</button>

<!-- Form in drawer with safe area -->
<div class="form-drawer-container">
  <form>
    <!-- form fields -->
  </form>
</div>
```

### 2. Using Flatpickr Utilities

#### Simple Date Picker (Date Only):

```typescript
import { FlatpickrUtils } from '../../shared/utils/flatpickr.utils';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-my-form',
  template: `
    <input type="text" id="dateInput" class="flatpickr-input" />
  `
})
export class MyFormComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  private datePicker: any;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.form = this.fb.group({
      date: [new Date()]
    });
    this.initializePickerOnOpen();
  }

  initializePickerOnOpen() {
    setTimeout(() => {
      this.datePicker = FlatpickrUtils.initializeDatePicker(
        this.form,
        'dateInput',
        'date'
      );
    }, 100);
  }

  ngOnDestroy() {
    FlatpickrUtils.destroy(this.datePicker);
  }
}
```

#### Datetime Picker (Date + Time):

```typescript
ngOnInit() {
  this.form = this.fb.group({
    dateTime: [new Date()]
  });
  this.initializePickerOnOpen();
}

initializePickerOnOpen() {
  setTimeout(() => {
    this.datePicker = FlatpickrUtils.initializeDatetimePicker(
      this.form,
      'datetimeInput',
      'dateTime'
    );
  }, 100);
}
```

#### Custom Flatpickr Configuration:

```typescript
this.datePicker = FlatpickrUtils.initializeCustom('dateInput', {
  enableTime: true,
  dateFormat: 'Y-m-d H:i',
  time_24hr: true,
  minDate: new Date(),
  maxDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  onChange: (selectedDates) => {
    console.log('Date selected:', selectedDates[0]);
  }
});
```

### 3. Using the Base Form Component

#### Extend BaseFormComponent for your form:

```typescript
import { BaseFormComponent } from '../../shared/components/base-form.component';
import { DatePickerConfig } from '../../shared/components/base-form.component';
import { Component } from '@angular/core';

@Component({
  selector: 'app-material-form',
  template: `
    <nz-drawer [nzVisible]="isDrawerVisible" (nzOnClose)="closeDrawer()">
      <form [formGroup]="form" (ngSubmit)="submitForm()">
        <input type="text" id="deliveryDate" class="flatpickr-input" />
        <button nz-button nzType="primary" class="btn-safe-area">Save</button>
      </form>
    </nz-drawer>
  `,
  styleUrls: ['./material-form.component.scss']
})
export class MaterialFormComponent extends BaseFormComponent {
  protected initializeForm(): void {
    this.form = this.fb.group({
      deliveryDate: [new Date()]
    });
  }

  protected getDatePickerConfig(): DatePickerConfig | null {
    return {
      inputId: 'deliveryDate',
      formControl: 'deliveryDate',
      enableTime: false
    };
  }

  async submitForm(): Promise<void> {
    if (this.form.valid) {
      // Handle form submission
      console.log(this.form.value);
      this.closeDrawer();
    }
  }
}
```

#### For Multiple Date Pickers:

```typescript
import { MultiDatePickerMixin } from '../../shared/components/base-form.component';

export class MultiPickerFormComponent extends BaseFormComponent {
  private multiPickerMixin = new MultiDatePickerMixin();

  protected initializeForm(): void {
    this.form = this.fb.group({
      startDate: [new Date()],
      endDate: [new Date()]
    });
  }

  protected initializeDatePickers(): void {
    this.multiPickerMixin.initializeMultipleDatePickers(this.form, [
      { inputId: 'startDate', formControl: 'startDate' },
      { inputId: 'endDate', formControl: 'endDate' }
    ]);
  }

  protected cleanupDatePickers(): void {
    this.multiPickerMixin.cleanupAllDatePickers();
  }

  async submitForm(): Promise<void> {
    // Implementation
  }
}
```

### 4. HTML Template Patterns

#### Complete Form Template:

```html
<form [formGroup]="form" (ngSubmit)="submitForm()" class="form-drawer-container">
  <!-- Text input -->
  <div class="form-group">
    <label class="required">Name</label>
    <input type="text" formControlName="name" class="form-control" />
  </div>

  <!-- Number input -->
  <div class="form-group">
    <label class="required">Amount (₹)</label>
    <input type="number" formControlName="amount" min="1" class="form-control" />
  </div>

  <!-- Select dropdown -->
  <div class="form-group">
    <label class="required">Category</label>
    <select formControlName="category" class="form-control">
      <option value="">Select category</option>
      <option value="material">Material</option>
      <option value="labor">Labor</option>
    </select>
  </div>

  <!-- Two column layout -->
  <div class="form-row grid-cols-2">
    <div class="form-group">
      <label class="required">From</label>
      <input type="text" formControlName="provider" class="form-control" />
    </div>
    <div class="form-group">
      <label class="required">To</label>
      <select formControlName="receiver" class="form-control">
        <option value="">Select receiver</option>
        <option value="ss">SS</option>
        <option value="nice">Nice</option>
      </select>
    </div>
  </div>

  <!-- Flatpickr date input -->
  <div class="form-group">
    <label class="required">Delivery Date</label>
    <input type="text" id="deliveryDate" class="flatpickr-input" />
  </div>

  <!-- Submit button with safe area -->
  <button nz-button nzType="primary" nzBlock nzSize="large" class="btn-safe-area mt-4">
    Save
  </button>
</form>
```

## Styling System

### Color Scheme
- **Background:** #262626 (neutral-800)
- **Text:** #f5f5f5 (neutral-50)
- **Border:** #404040 (neutral-700)
- **Accent (Focus/Hover):** #10b981 (emerald-500)
- **Error:** #ef4444 (red-500)
- **Success:** #10b981 (emerald-500)

### Form Control Specifications
- **Min Height:** 44px (iOS touch target)
- **Font Size:** 16px (prevents iOS zoom)
- **Padding:** 0.75rem
- **Border Radius:** 0.375rem
- **Border:** 1px solid #404040

### iOS Safe Area
- **Home Indicator Bottom:** `env(safe-area-inset-bottom)`
- **Notch Top:** `env(safe-area-inset-top)`
- **Dynamic Calculation:** `calc(value + env(safe-area-inset-bottom))`

## Form Control Features

### Native HTML5 Controls
- ✅ Full width by default
- ✅ 44px minimum height for touch
- ✅ Dark theme (neutral-800 background)
- ✅ Emerald focus states
- ✅ iOS appearance normalized
- ✅ Smooth transitions

### Flatpickr Date Picker
- ✅ Dark theme calendar
- ✅ Emerald accent colors
- ✅ Time selection support
- ✅ 24-hour format
- ✅ Mobile responsive
- ✅ Safe area aware

## Migration Guide

### From ng-zorro to Native Forms

**Before (ng-zorro):**
```html
<nz-select formControlName="field" class="w-full">
  <nz-option [nzValue]="'value'" [nzLabel]="'Label'"></nz-option>
</nz-select>
```

**After (Native):**
```html
<select formControlName="field" class="form-control">
  <option value="value">Label</option>
</select>
```

**Before (ng-zorro):**
```html
<nz-input-number formControlName="amount" [nzMin]="1" class="w-full"></nz-input-number>
```

**After (Native):**
```html
<input type="number" formControlName="amount" min="1" class="form-control" />
```

**Before (ng-zorro):**
```html
<nz-date-picker nzShowTime formControlName="dateTime"></nz-date-picker>
```

**After (Flatpickr):**
```html
<input type="text" id="datetimeInput" class="flatpickr-input" />
<!-- Initialize with FlatpickrUtils.initializeDatetimePicker() -->
```

## Performance Tips

1. **Lazy Initialize Pickers:** Only initialize date pickers when drawer opens
2. **Cleanup on Close:** Always destroy date picker instances to prevent memory leaks
3. **Use Base Component:** Extend BaseFormComponent to avoid repetitive code
4. **Centralize CSS:** Import shared form-controls.scss instead of duplicating styles
5. **Native Controls:** Prefer native HTML5 controls over ng-zorro for better performance

## Browser Compatibility

- ✅ iOS Safari (PWA)
- ✅ iOS Chrome/Firefox
- ✅ Android Browser
- ✅ Desktop Safari/Chrome/Firefox
- ✅ Edge (latest 2 versions)

## Accessibility

- ✅ 44px touch targets (WCAG AA)
- ✅ Focus indicators with high contrast
- ✅ Labels associated with inputs
- ✅ Error messages announced to screen readers
- ✅ Keyboard navigation support

## Troubleshooting

### Date Picker Not Initializing
- Ensure setTimeout(100ms) delay after drawer opens
- Check that input element ID matches config
- Verify DOM is ready before initialization

### Focus Issues on iOS
- Font size must be >= 16px (prevents zoom)
- Use `appearance: none` for proper styling
- Ensure outline color is visible

### Safe Area Not Applying
- Verify `viewport-fit=cover` in index.html meta tag
- Check that CSS uses `env(safe-area-inset-*)`
- Test on actual device (simulator may not show correctly)

## See Also
- `form-controls.scss` - Full SCSS file with all available classes
- `flatpickr.utils.ts` - Utility functions documentation
- `base-form.component.ts` - Base class documentation
