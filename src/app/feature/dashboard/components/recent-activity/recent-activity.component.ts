import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';

export interface DashboardActivity {
  title: string;
  subtitle: string;
  date: string | Date;
  color: string;
}

@Component({
  selector: 'app-dashboard-recent-activity',
  standalone: true,
  imports: [CommonModule, NzIconModule, NzTimelineModule],
  templateUrl: './recent-activity.component.html',
})
export class RecentActivityComponent {
  @Input({ required: true }) recentActivity!: DashboardActivity[];
}
