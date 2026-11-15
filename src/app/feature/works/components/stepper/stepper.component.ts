import { Component } from '@angular/core';
import { CdkStepper } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'sk-stepper',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  providers: [{ provide: CdkStepper, useExisting: StepperComponent }],
  templateUrl: './stepper.component.html',
})
export class StepperComponent extends CdkStepper {
  selectStepByIndex(index: number): void {
    this.selectedIndex = index;
  }
}
