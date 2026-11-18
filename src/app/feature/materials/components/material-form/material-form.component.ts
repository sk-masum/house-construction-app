import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TextfieldComponent } from '../../../../shared/components/textfield/textfield.component';
import { DatepickerComponent } from '../../../../shared/components/datepicker/datepicker.component';
import { SelectComponent } from '../../../../shared/components/select/select.component';
import { NzFormModule } from 'ng-zorro-antd/form';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-material-form',
  standalone: true,
  imports: [
    SelectComponent,
    DatepickerComponent,
    TextfieldComponent,
    NzFormModule,
    ReactiveFormsModule,
    DecimalPipe,
  ],
  templateUrl: './material-form.component.html',
  styleUrl: './material-form.component.scss',
})
export class MaterialFormComponent {
  @Input() materialForm!: FormGroup;
  @Input() dynamicMaterialOptions: string[] = [];
  @Input() dynamicPriceDefaults: Record<string, number> = {};
  @Input() builderOptions: string[] = [];

  @Output() submitFormEvent = new EventEmitter();

  submitForm() {
    this.submitFormEvent.emit();
  }
}
