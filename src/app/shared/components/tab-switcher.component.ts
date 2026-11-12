/**
 * ===================================================
 * REUSABLE TAB SWITCHER COMPONENT
 * ===================================================
 * A generic, theme-aware tab switcher component for switching between views.
 * Used for filtering, organizing, and displaying different data views.
 *
 * Features:
 * - Theme-based styling with CSS variables
 * - Transparent background with bottom border indicator
 * - Responsive design optimized for mobile
 * - Full keyboard navigation support
 * - High contrast and reduced motion support
 *
 * Usage:
 *   <app-tab-switcher
 *     [tabs]="tabs"
 *     [activeValue]="activeView"
 *     (onTabChange)="onTabChange($event)"
 *   ></app-tab-switcher>
 * ===================================================
 */

import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TabConfig {
  label: string;
  value: string;
}

@Component({
  selector: 'app-tab-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tab-switcher-container">
      <button
        *ngFor="let tab of tabs; trackBy: trackByValue"
        (click)="onTabClick(tab.value)"
        [class.active]="tab.value === activeValue"
        class="tab-switcher-button"
      >
        {{ tab.label }}
      </button>
    </div>
  `,
  styleUrls: ['./tab-switcher.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"tab-switcher"',
  },
})
export class TabSwitcherComponent {
  /**
   * Array of tab configurations with label and value
   */
  @Input() tabs: TabConfig[] = [];

  /**
   * Currently active tab value
   */
  @Input() activeValue: string = '';

  /**
   * Emits when a tab is clicked with the tab value
   */
  @Output() onTabChange = new EventEmitter<string>();

  /**
   * Handle tab click
   */
  onTabClick(value: string): void {
    if (value !== this.activeValue) {
      this.onTabChange.emit(value);
    }
  }

  /**
   * TrackBy function for ngFor optimization
   */
  trackByValue(_index: number, tab: TabConfig): string {
    return tab.value;
  }
}
