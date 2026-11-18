import { CommonModule } from '@angular/common';
import { Component, Input, TemplateRef } from '@angular/core';
import { DateHeaderComponent } from '../../../../shared/components/date-header/date-header.component';

@Component({
  selector: 'app-transaction-by-date',
  standalone: true,
  imports: [CommonModule, DateHeaderComponent],
  templateUrl: './transaction-by-date.component.html',
  styleUrl: './transaction-by-date.component.scss',
})
export class TransactionByDateComponent {
  @Input({ required: true }) dateGroups: any[] = [];
  @Input() itemCardTemplate!: TemplateRef<any>;
}
