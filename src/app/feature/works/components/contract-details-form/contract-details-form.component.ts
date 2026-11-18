import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { TextfieldComponent } from '../../../../shared/components/textfield/textfield.component';
import { SelectComponent } from '../../../../shared/components/select/select.component';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-contract-details-form',
  standalone: true,
  imports: [
    NzFormModule,
    ReactiveFormsModule,
    DecimalPipe,
    TextfieldComponent,
    SelectComponent,
  ],
  templateUrl: './contract-details-form.component.html',
  styleUrl: './contract-details-form.component.scss',
})
export class ContractDetailsFormComponent {
  readonly SERVICE_TYPES = ['Sq Ft', 'Lump Sum', 'Daily Rate'];

  @Input({ required: true }) projectForm!: FormGroup;
  @Input({ required: true }) contractorOptions: string[] = [];

  @Output() saveWorkStep = new EventEmitter<void>();
}
