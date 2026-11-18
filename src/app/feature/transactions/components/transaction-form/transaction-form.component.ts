import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NzFormModule } from 'ng-zorro-antd/form';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ReceiverOption } from '../../models/transaction.model';
import { Transaction } from '../../../../core/services/transaction.service';
import { DatepickerComponent } from '../../../../shared/components/datepicker/datepicker.component';
import { SelectComponent } from '../../../../shared/components/select/select.component';

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [
    NzFormModule,
    ReactiveFormsModule,
    SelectComponent,
    DatepickerComponent,
  ],
  templateUrl: './transaction-form.component.html',
  styleUrl: './transaction-form.component.scss',
})
export class TransactionFormComponent {
  @Input() transactionForm!: FormGroup;
  @Output() submitEvent = new EventEmitter<void>();
  @Input() displayTransactions: Transaction[] = [];
  @Input() directoryReceivers: ReceiverOption[] = [];

  get receiverOptions(): ReceiverOption[] {
    const directoryNames = new Set(
      this.directoryReceivers.map((receiver) => receiver.name),
    );
    const previousNames = Array.from(
      new Set(
        this.displayTransactions.map((transaction) => transaction.receiver),
      ),
    )
      .filter((name) => !directoryNames.has(name))
      .sort((a, b) => a.localeCompare(b));
    return [
      ...this.directoryReceivers,
      ...previousNames.map(
        (name): ReceiverOption => ({
          name,
          group: 'Previous Receivers',
        }),
      ),
    ];
  }
}
