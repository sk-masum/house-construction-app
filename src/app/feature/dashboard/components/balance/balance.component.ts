import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { Project } from '../../../../core/services/project.service';

@Component({
  selector: 'app-dashboard-balance',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  templateUrl: './balance.component.html',
})
export class BalanceComponent {
  @Input({ required: true }) activeProject!: Project | null;
  @Input({ required: true }) outstandingBalance!: number;
  @Input({ required: true }) isAdvance!: boolean;
}
