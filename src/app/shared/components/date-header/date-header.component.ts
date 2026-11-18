import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-date-header',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './date-header.component.html',
  styleUrl: './date-header.component.scss',
})
export class DateHeaderComponent {
  @Input() totalAmount!: number;
  @Input() numberOfPayments!: number;
  @Input() displayDate!: Date;
  @Input() theme = 'blue';
}
