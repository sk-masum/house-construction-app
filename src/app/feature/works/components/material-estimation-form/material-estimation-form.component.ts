import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ProjectEstimation } from '../../../../core/services/project.service';
import { DecimalPipe } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { SelectComponent } from '../../../../shared/components/select/select.component';
import { TextfieldComponent } from '../../../../shared/components/textfield/textfield.component';

@Component({
  selector: 'app-material-estimation-form',
  standalone: true,
  imports: [
    DecimalPipe,
    NzFormModule,
    ReactiveFormsModule,
    SelectComponent,
    TextfieldComponent,
  ],
  templateUrl: './material-estimation-form.component.html',
  styleUrl: './material-estimation-form.component.scss',
})
export class MaterialEstimationFormComponent {
  readonly UNIT_OPTIONS = ['Bags', 'Pcs', 'VC', 'Kg', 'Ton'];

  @Input({ required: true }) currentEstimations: ProjectEstimation[] = [];
  @Input({ required: true }) estimationForm!: FormGroup;
  @Input({ required: true }) dynamicMaterialOptions: string[] = [];

  @Output() removeEstimation = new EventEmitter<number>();
  @Output() addEstimation = new EventEmitter<void>();
  @Output() closeDrawer = new EventEmitter<void>();

  get currentEstimationsTotal(): number {
    return this.currentEstimations.reduce(
      (sum, est) => sum + (est.totalCost || 0),
      0,
    );
  }
}
