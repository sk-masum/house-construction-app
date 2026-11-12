import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { DbService, Transaction } from '../../core/services/db.service';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzDrawerModule,
    NzFormModule,
    NzInputModule,
    NzInputNumberModule,
    NzButtonModule,
    NzIconModule,
    NzPopconfirmModule,
  ],
  templateUrl: './transactions.component.html',
})
export class TransactionsComponent implements OnInit {
  readonly RECEIVER_OPTIONS = ['SS', 'Nice', 'KGN', 'Sukhchand'];

  // Form & View States
  isDrawerVisible = false;
  transactionForm!: FormGroup;
  activeView: 'date' | 'receiver' = 'date';
  sortOrder: 'desc' | 'asc' = 'desc';

  // Data States
  rawTransactions: Transaction[] = [];
  displayTransactions: Transaction[] = [];

  // Aggregated Groups
  dateGroups: any[] = [];
  receiverGroups: any[] = [];

  // Drill-Down States
  isDetailVisible = false;
  detailTitle = '';
  detailItems: Transaction[] = [];

  // Flatpickr instance
  private datetimePickerInstance: any;

  constructor(
    private fb: FormBuilder,
    private db: DbService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadTransactions();
  }

  initForm(): void {
    this.transactionForm = this.fb.group({
      id: [null],
      amount: [null, [Validators.required, Validators.min(1)]],
      dateTime: [new Date(), [Validators.required]],
      provider: [null, [Validators.required]],
      receiver: [null, [Validators.required]],
    });
  }

  async loadTransactions() {
    this.rawTransactions = await this.db.getAllTransactions();
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.rawTransactions];

    // Apply Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.dateTime).getTime();
      const dateB = new Date(b.dateTime).getTime();
      return this.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    this.displayTransactions = filtered;
    this.buildGroups();
  }

  buildGroups(): void {
    const dateMap = new Map<string, any>();
    const receiverMap = new Map<string, any>();

    for (const item of this.displayTransactions) {
      // 1. Group by Receiver
      if (!receiverMap.has(item.receiver)) {
        receiverMap.set(item.receiver, {
          name: item.receiver,
          totalAmount: 0,
          count: 0,
          items: [],
        });
      }
      const rGroup = receiverMap.get(item.receiver);
      rGroup.totalAmount += item.amount;
      rGroup.count++;
      rGroup.items.push(item);

      // 2. Group by Date
      const d = new Date(item.dateTime);
      const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          dateKey: dateKey,
          displayDate: item.dateTime,
          totalAmount: 0,
          count: 0,
          items: [],
        });
      }
      const dGroup = dateMap.get(dateKey);
      dGroup.totalAmount += item.amount;
      dGroup.count++;
      dGroup.items.push(item);
    }

    this.receiverGroups = Array.from(receiverMap.values()).sort(
      (a, b) => b.totalAmount - a.totalAmount,
    );

    this.dateGroups = Array.from(dateMap.values()).sort((a, b) => {
      const timeA = new Date(a.displayDate).getTime();
      const timeB = new Date(b.displayDate).getTime();
      return this.sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    this.cdr.detectChanges(); // Instantly update UI
  }

  // --- Navigation & Drill Down ---
  setView(view: 'date' | 'receiver') {
    this.activeView = view;
  }

  openDetail(title: string, items: Transaction[]) {
    this.detailTitle = title;
    this.detailItems = items;
    this.isDetailVisible = true;
  }

  closeDetail() {
    this.isDetailVisible = false;
  }

  private updateDetailView() {
    if (this.activeView === 'receiver') {
      const group = this.receiverGroups.find(
        (g) => g.name === this.detailTitle,
      );
      this.detailItems = group ? group.items : [];
    }
    this.cdr.detectChanges();
  }

  // --- CRUD Methods ---
  openDrawer(transaction?: Transaction): void {
    if (transaction) {
      this.transactionForm.patchValue(transaction);
    } else {
      this.transactionForm.reset({ dateTime: new Date() });
    }
    this.isDrawerVisible = true;
    setTimeout(() => this.initializeFlatpickr(), 100);
  }

  closeDrawer(): void {
    this.isDrawerVisible = false;
    if (this.datetimePickerInstance) {
      this.datetimePickerInstance.destroy();
      this.datetimePickerInstance = null;
    }
  }

  async submitForm() {
    if (this.transactionForm.valid) {
      const formValue = this.transactionForm.getRawValue();

      if (formValue.id) {
        await this.db.transactions.put(formValue);
      } else {
        delete formValue.id;
        await this.db.addTransaction(formValue);
      }

      this.closeDrawer();
      await this.loadTransactions();

      if (this.isDetailVisible) {
        this.updateDetailView();
      }
    }
  }

  async deleteTransaction(id: number) {
    if (id) {
      await this.db.deleteTransaction(id);
      await this.loadTransactions();

      if (this.isDetailVisible) {
        this.detailItems = this.detailItems.filter((i) => i.id !== id);
        if (this.detailItems.length === 0) this.closeDetail();
      }
    }
  }

  // --- Flatpickr Initialization ---
  private initializeFlatpickr(): void {
    const inputElement = document.getElementById('datetimeInput') as HTMLInputElement;
    if (!inputElement) return;

    if (this.datetimePickerInstance) {
      this.datetimePickerInstance.destroy();
    }

    const currentValue = this.transactionForm.get('dateTime')?.value;
    const dateString = currentValue ? this.formatDateForFlatpickr(currentValue) : '';

    this.datetimePickerInstance = flatpickr('#datetimeInput', {
      enableTime: true,
      dateFormat: 'Y-m-d H:i',
      time_24hr: true,
      defaultDate: dateString,
      onChange: (selectedDates) => {
        if (selectedDates.length > 0) {
          this.transactionForm.patchValue({
            dateTime: selectedDates[0],
          });
        }
      },
    });
  }

  private formatDateForFlatpickr(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
}

