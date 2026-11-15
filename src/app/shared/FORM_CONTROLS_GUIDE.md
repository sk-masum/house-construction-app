# Centralized Form Controls & Utilities Guide

## Overview

This guide explains how to use the centralized form control styles and utilities to build iOS-optimized forms with native controls.

## File Structure

```
src/app/shared/
├── styles/
│   └── form-controls.scss         # Centralized form control CSS
└── components/
    ├── base-form.component.ts     # Base class for form components
    └── datepicker/
        └── datepicker.component.ts # Date picker component
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

<!-- Date input -->
<input type="date" class="form-control" />

<!-- DateTime input -->
<input type="datetime-local" class="form-control" />

<!-- Button with safe area padding -->
<button class="btn-safe-area">Submit</button>

<!-- Form in drawer with safe area -->
<div class="form-drawer-container">
  <form>
    <!-- form fields -->
  </form>
</div>
```

### 2. Using the Base Form Component

#### Extend BaseFormComponent for your form:

```typescript
import { BaseFormComponent } from '../../shared/components/base-form.component';
import { Component } from '@angular/core';

@Component({
  selector: 'app-material-form',
  template: `
    <nz-drawer [nzVisible]="isDrawerVisible" (nzOnClose)="closeDrawer()">
      <form [formGroup]="form" (ngSubmit)="submitForm()">
        <input type="date" formControlName="deliveryDate" class="form-control" />
        <button nz-button nzType="primary" class="btn-safe-area">Save</button>
      </form>
    </nz-drawer>
  `,
  styleUrls: ['./material-form.component.scss']
})
export class MaterialFormComponent extends BaseFormComponent {
  protected initializeForm(): void {
    this.form = this.fb.group({
      deliveryDate: [new Date().toISOString().split('T')[0]]
    });
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

### 3. Complete Form Template Example:

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

  <!-- Date input -->
  <div class="form-group">
    <label class="required">Delivery Date</label>
    <input type="date" formControlName="deliveryDate" class="form-control" />
  </div>

  <!-- DateTime input -->
  <div class="form-group">
    <label class="required">Delivery DateTime</label>
    <input type="datetime-local" formControlName="dateTime" class="form-control" />
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

### Native Date/DateTime Pickers
- ✅ Browser native date picker (iOS calendar)
- ✅ DateTime support with time selection
- ✅ Mobile optimized
- ✅ No external dependencies needed
- ✅ Accessible and semantic

## Performance Tips

1. **Use Native Controls:** Prefer HTML5 `<input type="date">` over external libraries
2. **Extend Base Component:** Use BaseFormComponent to avoid repetitive code
3. **Centralize CSS:** Import shared form-controls.scss instead of duplicating styles
4. **Form Validation:** Use Angular reactive forms for built-in validation
5. **Lazy Load:** Load components on demand using route lazy loading

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

### Focus Issues on iOS
- Font size must be >= 16px (prevents zoom)
- Use `appearance: none` for proper styling
- Ensure outline color is visible

### Safe Area Not Applying
- Verify `viewport-fit=cover` in index.html meta tag
- Check that CSS uses `env(safe-area-inset-*)`
- Test on actual device (simulator may not show correctly)

### Date Input Not Working
- Ensure you're using `type="date"` or `type="datetime-local"`
- Check browser compatibility (all modern browsers support this)
- Use proper date format (YYYY-MM-DD for date input)

## See Also
- `form-controls.scss` - Full SCSS file with all available classes
- `base-form.component.ts` - Base class documentation
- `datepicker.component.ts` - Custom date picker component
