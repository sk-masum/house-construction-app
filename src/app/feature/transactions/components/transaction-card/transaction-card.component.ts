import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

@Component({
  selector: 'app-transaction-card',
  standalone: true,
  imports: [DecimalPipe, DatePipe, NzIconModule, NzPopconfirmModule],
  templateUrl: './transaction-card.component.html',
  styleUrl: './transaction-card.component.scss',
})
export class TransactionCardComponent {
  @Input() item: any;
  @Output() openDrawerEvent = new EventEmitter<any>();
  @Output() deleteTransactionEvent = new EventEmitter<number>();
}
