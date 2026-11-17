import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-circle-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './circle-chart.component.html',
})
export class CircleChartComponent implements OnChanges {
  @Input() totalCost: number = 0;
  @Input() totalPaid: number = 0;
  @Input() colorClass: string = 'text-blue-500'; // Allow custom colors!

  percent: number = 0;
  circumference: number = 2 * Math.PI * 70;
  offset: number = this.circumference;

  ngOnChanges() {
    if (this.totalCost > 0) {
      this.percent = Math.min((this.totalPaid / this.totalCost) * 100, 100);
      this.offset =
        this.circumference - (this.percent / 100) * this.circumference;
    } else {
      this.percent = 0;
      this.offset = this.circumference;
    }
  }
}
