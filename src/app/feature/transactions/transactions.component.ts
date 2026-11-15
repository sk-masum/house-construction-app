import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { SelectComponent } from '../../shared/components/select/select.component';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { DbService, Transaction } from '../../core/services/db.service';
import { FlatpickrUtils } from '../../shared/utils/flatpickr.utils';
import {
  TabSwitcherComponent,
  TabConfig,
} from '../../shared/components/tab-switcher.component';
import 'flatpickr/dist/flatpickr.min.css';

import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { Subscription } from 'rxjs';
import { DatepickerComponent } from '../../shared/components/datepicker/datepicker.component';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TabSwitcherComponent,
    NzDrawerModule,
    NzFormModule,
    NzInputModule,
    NzInputNumberModule,
    NzButtonModule,
    NzIconModule,
    NzPopconfirmModule,
    SelectComponent,
    DatepickerComponent,
  ],
  templateUrl: './transactions.component.html',
})
export class TransactionsComponent implements OnInit, OnDestroy {
  private workSub!: Subscription;
  readonly RECEIVER_OPTIONS = ['SS', 'Nice', 'KGN', 'Sukhchand'];

  readonly tabs: TabConfig[] = [
    { label: 'By Date', value: 'date' },
    { label: 'By Receiver', value: 'receiver' },
  ];

  currentSqlFilters: any = {};
  isLoading = false;

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
    this.workSub = this.db.activeWorkId$.subscribe(async () => {
      await this.loadTransactions();
    });
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
    await this.applyFilters();
  }

  async applyFilters() {
    this.isLoading = true;
    this.cdr.detectChanges();

    // Set up current filters (currently just sortOrder, but ready for a filterForm if you add one)
    this.currentSqlFilters = {
      sortOrder: this.sortOrder,
    };

    // Fetch the detailed list AND the summary aggregations concurrently
    const [display, receiverAgg] = await Promise.all([
      this.db.getFilteredTransactions(this.currentSqlFilters),
      this.db.getReceiverSummaries(this.currentSqlFilters),
    ]);

    this.displayTransactions = display;
    this.receiverGroups = receiverAgg;

    this.buildDateGroups(); // Group the flat list for the Date timeline UI

    this.isLoading = false;
    this.cdr.detectChanges();
  }

  buildDateGroups(): void {
    const dateMap = new Map<string, any>();
    for (const item of this.displayTransactions) {
      const d = new Date(item.dateTime);
      const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          dateKey,
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
    // They are already sorted by SQL, so just convert to array
    this.dateGroups = Array.from(dateMap.values());
  }

  // --- Navigation & Drill Down ---
  setView(view: 'date' | 'receiver') {
    this.activeView = view;
  }

  onTabChange(value: string) {
    this.setView(value as 'date' | 'receiver');
  }

  async openDetail(title: string, type: 'receiver') {
    this.detailTitle = title;
    this.isDetailVisible = true;
    this.detailItems = []; // Clear for instant UI feedback
    this.cdr.detectChanges();

    const drillDownFilters = { ...this.currentSqlFilters };
    if (type === 'receiver') drillDownFilters.receivers = [title];

    this.detailItems = await this.db.getFilteredTransactions(drillDownFilters);
    this.cdr.detectChanges();
  }

  closeDetail() {
    this.isDetailVisible = false;
  }

  private async updateDetailView() {
    const drillDownFilters = { ...this.currentSqlFilters };
    if (this.activeView === 'receiver') {
      drillDownFilters.receivers = [this.detailTitle];
    }
    this.detailItems = await this.db.getFilteredTransactions(drillDownFilters);
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
    FlatpickrUtils.destroy(this.datetimePickerInstance);
    this.datetimePickerInstance = null;
  }

  async submitForm() {
    if (this.transactionForm.valid) {
      const formValue = this.transactionForm.getRawValue();

      // 1. BULLETPROOF OBJECT CREATION
      const transactionToSave = {
        ...formValue,
        workId: this.db.activeWorkId$.value || null, // Safely inject the context
      };

      // 2. Format Date
      if (!(transactionToSave.dateTime instanceof Date)) {
        transactionToSave.dateTime = new Date(transactionToSave.dateTime);
      }

      // 3. Route to SQLite
      if (transactionToSave.id) {
        await this.db.updateTransaction(transactionToSave);
      } else {
        delete transactionToSave.id;
        await this.db.addTransaction(transactionToSave);
      }

      this.closeDrawer();
      await this.loadTransactions();
    }
  }

  async deleteTransaction(id: number) {
    if (id) {
      await this.db.deleteTransaction(id);
      await this.loadTransactions();

      if (this.isDetailVisible) {
        await this.updateDetailView();
        if (this.detailItems.length === 0) this.closeDetail();
      }
    }
  }

  // --- Flatpickr Initialization ---
  private initializeFlatpickr(): void {
    this.datetimePickerInstance = FlatpickrUtils.initializeDatetimePicker(
      this.transactionForm,
      'datetimeInput',
      'dateTime',
    );
  }
  ngOnDestroy(): void {
    if (this.workSub) this.workSub.unsubscribe();
  }
}
