import { Component, Input } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-dashboard-purchase-distribution',
  standalone: true,
  imports: [NzIconModule, BaseChartDirective],
  templateUrl: './purchase-distribution.component.html',
})
export class PurchaseDistributionComponent {
  @Input({ required: true }) pieChartData!: ChartData<'doughnut'>;
  @Input({ required: true }) pieChartOptions!: ChartConfiguration['options'];
}
