import { DecimalPipe } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ReceiverSummary } from '../../models/transaction.model';

@Component({
  selector: 'app-transaction-receiver',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './transaction-receiver.component.html',
  styleUrl: './transaction-receiver.component.scss',
})
export class TransactionReceiverComponent {
  @Input({ required: true }) receiverGroups: ReceiverSummary[] = [];
  @Output() openDetailEvent = new EventEmitter<{
    name: string;
    type: string;
  }>();
}
