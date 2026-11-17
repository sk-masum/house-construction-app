import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { CircleChartComponent } from '../circle-chart/circle-chart.component';

@Component({
  selector: 'app-dashboard-payment-breakdown',
  standalone: true,
  imports: [CommonModule, NzIconModule, CircleChartComponent],
  templateUrl: './payment-breakdown.component.html',
})
export class PaymentBreakdownComponent {
  @Input({ required: true }) contractorTotal!: number;
  @Input({ required: true }) contractorPaid!: number;
  @Input({ required: true }) materialTotal!: number;
  @Input({ required: true }) materialPaid!: number;
}
