import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { Project } from '../../../../core/services/project.service';

export interface MaterialProgress {
  materialName: string;
  estimatedQty: number;
  unit: string;
  actualQty: number;
  percent: number;
}

@Component({
  selector: 'app-dashboard-estimation',
  standalone: true,
  imports: [CommonModule, NzIconModule, NzProgressModule],
  templateUrl: './estimation.component.html',
})
export class EstimationComponent {
  @Input({ required: true }) activeProject!: Project | null;
  @Input({ required: true }) totalEstimatedMaterialCost!: number;
  @Input({ required: true }) totalServiceCharge!: number;
  @Input({ required: true }) progressData!: MaterialProgress[];
}
