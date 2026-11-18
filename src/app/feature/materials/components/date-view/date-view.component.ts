import { CommonModule } from '@angular/common';
import { Component, Input, TemplateRef } from '@angular/core';
import { DateHeaderComponent } from '../../../../shared/components/date-header/date-header.component';

@Component({
  selector: 'app-date-view',
  standalone: true,
  imports: [CommonModule, DateHeaderComponent],
  templateUrl: './date-view.component.html',
  styleUrl: './date-view.component.scss',
})
export class DateViewComponent {
  @Input() dateGroups: any[] = [];
  @Input() itemCardTemplate!: TemplateRef<any>;
}
