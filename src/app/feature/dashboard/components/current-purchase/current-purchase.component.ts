import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { Project } from '../../../../core/services/project.service';

@Component({
  selector: 'app-dashboard-current-purchase',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  templateUrl: './current-purchase.component.html',
})
export class CurrentPurchaseComponent {
  @Input({ required: true }) activeProject!: Project | null;
  @Input({ required: true }) totalMaterialCost!: number;
  @Input({ required: true }) totalEstimatedMaterialCost!: number;
  @Input({ required: true }) contractorPaid!: number;
  @Input({ required: true }) totalTransactions!: number;
}
